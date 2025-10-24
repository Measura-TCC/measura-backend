import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  REQUIREMENT_REPOSITORY,
  IRequirementRepository,
} from '@domain/fpa/interfaces/requirement.repository.interface';
import { Requirement } from '@domain/fpa/entities/requirement.entity';
import { GitHubClient } from '../clients/github.client';
import { OrganizationIntegrationService } from './organization-integration.service';
import { GitHubIntegration } from '@domain/organizations/entities/organization.entity';
import { ImportGitHubRequirementsDto } from '../dtos/import-github-requirements.dto';
import { ImportResult } from '@domain/integrations/interfaces/integration-client.interface';

@Injectable()
export class GitHubImportService {
  constructor(
    @Inject(REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: IRequirementRepository,
    private readonly githubClient: GitHubClient,
    private readonly integrationService: OrganizationIntegrationService,
  ) {}

  async importRequirements(dto: ImportGitHubRequirementsDto): Promise<ImportResult & { requirements: Requirement[] }> {
    const integration = await this.integrationService.getIntegration<GitHubIntegration>(
      dto.organizationId,
      'github',
    );

    const decryptedToken = this.integrationService.decryptToken(integration.token);

    const externalIssues = await this.githubClient.fetchIssues({
      token: decryptedToken,
      owner: dto.owner,
      repo: dto.repo,
      state: dto.state,
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
        'github',
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
          source: 'github',
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

    await this.integrationService.updateLastUsed(dto.organizationId, 'github');

    return result;
  }
}
