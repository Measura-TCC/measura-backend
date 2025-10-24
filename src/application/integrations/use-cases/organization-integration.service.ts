import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ORGANIZATION_REPOSITORY,
  IOrganizationRepository,
} from '@domain/organizations/interfaces/organization.repository.interface';
import {
  JiraIntegration,
  GitHubIntegration,
  ClickUpIntegration,
  AzureDevOpsIntegration,
} from '@domain/organizations/entities/organization.entity';
import { encrypt, decrypt, maskToken } from '@shared/utils/encryption.util';
import { ConfigureJiraDto } from '../dtos/configure-jira.dto';
import { ConfigureGitHubDto } from '../dtos/configure-github.dto';
import { ConfigureClickUpDto } from '../dtos/configure-clickup.dto';
import { ConfigureAzureDevOpsDto } from '../dtos/configure-azure-devops.dto';

@Injectable()
export class OrganizationIntegrationService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async configureJira(
    organizationId: string,
    userId: string,
    dto: ConfigureJiraDto,
  ): Promise<JiraIntegration> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const encryptedToken = encrypt(dto.apiToken);

    const jiraIntegration: JiraIntegration = {
      domain: dto.domain,
      email: dto.email,
      apiToken: encryptedToken,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      configuredBy: new Types.ObjectId(userId),
      configuredAt: new Date(),
    };

    await this.organizationRepository.update(organizationId, {
      'integrations.jira': jiraIntegration,
    } as any);

    return {
      ...jiraIntegration,
      apiToken: maskToken(dto.apiToken),
    };
  }

  async configureGitHub(
    organizationId: string,
    userId: string,
    dto: ConfigureGitHubDto,
  ): Promise<GitHubIntegration> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const encryptedToken = encrypt(dto.token);

    const githubIntegration: GitHubIntegration = {
      token: encryptedToken,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      configuredBy: new Types.ObjectId(userId),
      configuredAt: new Date(),
    };

    await this.organizationRepository.update(organizationId, {
      'integrations.github': githubIntegration,
    } as any);

    return {
      ...githubIntegration,
      token: maskToken(dto.token),
    };
  }

  async configureClickUp(
    organizationId: string,
    userId: string,
    dto: ConfigureClickUpDto,
  ): Promise<ClickUpIntegration> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const encryptedToken = encrypt(dto.token);

    const clickupIntegration: ClickUpIntegration = {
      token: encryptedToken,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      configuredBy: new Types.ObjectId(userId),
      configuredAt: new Date(),
    };

    await this.organizationRepository.update(organizationId, {
      'integrations.clickup': clickupIntegration,
    } as any);

    return {
      ...clickupIntegration,
      token: maskToken(dto.token),
    };
  }

  async configureAzureDevOps(
    organizationId: string,
    userId: string,
    dto: ConfigureAzureDevOpsDto,
  ): Promise<AzureDevOpsIntegration> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const encryptedPat = encrypt(dto.pat);

    const azureDevopsIntegration: AzureDevOpsIntegration = {
      organization: dto.organization,
      pat: encryptedPat,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      configuredBy: new Types.ObjectId(userId),
      configuredAt: new Date(),
    };

    await this.organizationRepository.update(organizationId, {
      'integrations.azureDevops': azureDevopsIntegration,
    } as any);

    return {
      ...azureDevopsIntegration,
      pat: maskToken(dto.pat),
    };
  }

  async updateIntegration(
    organizationId: string,
    integrationType: 'jira' | 'github' | 'clickup' | 'azureDevops',
    enabled: boolean,
  ): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const integration = organization.integrations?.[integrationType];
    if (!integration) {
      throw new NotFoundException(`${integrationType} integration not configured`);
    }

    await this.organizationRepository.update(organizationId, {
      [`integrations.${integrationType}.enabled`]: enabled,
    } as any);
  }

  async deleteIntegration(
    organizationId: string,
    integrationType: 'jira' | 'github' | 'clickup' | 'azureDevops',
  ): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    await this.organizationRepository.update(organizationId, {
      [`integrations.${integrationType}`]: null,
    } as any);
  }

  async getIntegration<T>(
    organizationId: string,
    integrationType: 'jira' | 'github' | 'clickup' | 'azureDevops',
  ): Promise<T> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const integration = organization.integrations?.[integrationType];
    if (!integration) {
      throw new BadRequestException(`${integrationType} integration not configured for this organization`);
    }

    if (!integration.enabled) {
      throw new ForbiddenException(`${integrationType} integration is currently disabled`);
    }

    return integration as T;
  }

  decryptToken(encryptedToken: string): string {
    return decrypt(encryptedToken);
  }

  async updateLastUsed(
    organizationId: string,
    integrationType: 'jira' | 'github' | 'clickup' | 'azureDevops',
  ): Promise<void> {
    await this.organizationRepository.update(organizationId, {
      [`integrations.${integrationType}.lastUsedAt`]: new Date(),
    } as any);
  }
}
