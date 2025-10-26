import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  REQUIREMENT_REPOSITORY,
  IRequirementRepository,
} from '@domain/fpa/interfaces/requirement.repository.interface';
import { Requirement } from '@domain/fpa/entities/requirement.entity';
import { AzureDevOpsClient } from '../clients/azure-devops.client';
import { OrganizationIntegrationService } from './organization-integration.service';
import { AzureDevOpsIntegration } from '@domain/organizations/entities/organization.entity';
import { ImportAzureDevOpsRequirementsDto } from '../dtos/import-azure-devops-requirements.dto';
import { ImportResult } from '@domain/integrations/interfaces/integration-client.interface';

@Injectable()
export class AzureDevOpsImportService {
  constructor(
    @Inject(REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: IRequirementRepository,
    private readonly azureDevOpsClient: AzureDevOpsClient,
    private readonly integrationService: OrganizationIntegrationService,
  ) {}

  async importRequirements(dto: ImportAzureDevOpsRequirementsDto): Promise<ImportResult & { requirements: Requirement[] }> {
    const { preview = false } = dto;

    const integration = await this.integrationService.getIntegration<AzureDevOpsIntegration>(
      dto.organizationId,
      'azureDevops',
    );

    const decryptedPat = this.integrationService.decryptToken(integration.pat);

    const externalIssues = await this.azureDevOpsClient.fetchIssues({
      organization: integration.organization,
      project: dto.project,
      pat: decryptedPat,
      wiql: dto.wiql,
    });

    const result: ImportResult & { requirements: Requirement[] } = {
      imported: 0,
      skipped: 0,
      failed: 0,
      requirements: [],
      errors: [],
    };

    if (preview) {
      for (const issue of externalIssues) {
        const requirement = {
          _id: new Types.ObjectId(),
          title: issue.title,
          description: issue.description,
          source: 'azure_devops' as const,
          sourceReference: issue.id,
          sourceMetadata: {
            ...issue.metadata,
            externalUrl: issue.externalUrl,
          },
          estimateId: dto.estimateId ? new Types.ObjectId(dto.estimateId) : undefined,
          organizationId: new Types.ObjectId(dto.organizationId),
          projectId: new Types.ObjectId(dto.projectId),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;

        result.requirements.push(requirement);
        result.imported++;
      }

      return result;
    }

    if (!dto.estimateId) {
      throw new Error('estimateId is required when not in preview mode');
    }

    for (const issue of externalIssues) {
      const existing = await this.requirementRepository.findBySource(
        dto.estimateId,
        'azure_devops',
        issue.id,
      );

      if (existing) {
        result.skipped++;
        continue;
      }

      try {
        const requirement = await this.requirementRepository.create({
          title: issue.title,
          description: issue.description,
          source: 'azure_devops',
          sourceReference: issue.id,
          sourceMetadata: {
            ...issue.metadata,
            externalUrl: issue.externalUrl,
          },
          estimateId: new Types.ObjectId(dto.estimateId),
          organizationId: new Types.ObjectId(dto.organizationId),
          projectId: new Types.ObjectId(dto.projectId),
        });

        result.requirements.push(requirement);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors?.push({
          item: issue.id,
          error: error.message,
        });
      }
    }

    await this.integrationService.updateLastUsed(dto.organizationId, 'azureDevops');

    return result;
  }
}
