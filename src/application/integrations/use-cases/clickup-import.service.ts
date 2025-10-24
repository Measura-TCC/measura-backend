import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  REQUIREMENT_REPOSITORY,
  IRequirementRepository,
} from '@domain/fpa/interfaces/requirement.repository.interface';
import { Requirement } from '@domain/fpa/entities/requirement.entity';
import { ClickUpClient } from '../clients/clickup.client';
import { OrganizationIntegrationService } from './organization-integration.service';
import { ClickUpIntegration } from '@domain/organizations/entities/organization.entity';
import { ImportClickUpRequirementsDto } from '../dtos/import-clickup-requirements.dto';
import { ImportResult } from '@domain/integrations/interfaces/integration-client.interface';

@Injectable()
export class ClickUpImportService {
  constructor(
    @Inject(REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: IRequirementRepository,
    private readonly clickupClient: ClickUpClient,
    private readonly integrationService: OrganizationIntegrationService,
  ) {}

  async importRequirements(dto: ImportClickUpRequirementsDto): Promise<ImportResult & { requirements: Requirement[] }> {
    const integration = await this.integrationService.getIntegration<ClickUpIntegration>(
      dto.organizationId,
      'clickup',
    );

    const decryptedToken = this.integrationService.decryptToken(integration.token);

    const externalIssues = await this.clickupClient.fetchIssues({
      token: decryptedToken,
      listId: dto.listId,
      includeClosed: dto.includeClosed,
    });

    const result: ImportResult & { requirements: Requirement[] } = {
      imported: 0,
      skipped: 0,
      failed: 0,
      requirements: [],
      errors: [],
    };

    for (const issue of externalIssues) {
      const existing = await this.requirementRepository.findBySource(
        dto.estimateId,
        'clickup',
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
          source: 'clickup',
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

    await this.integrationService.updateLastUsed(dto.organizationId, 'clickup');

    return result;
  }
}
