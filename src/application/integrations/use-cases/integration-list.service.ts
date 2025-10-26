import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY, IOrganizationRepository } from '@domain/organizations/interfaces/organization.repository.interface';
import { decrypt } from '@shared/utils/encryption.util';
import { JiraClient } from '../clients/jira.client';
import { GitHubClient } from '../clients/github.client';
import { ClickUpClient } from '../clients/clickup.client';
import { AzureDevOpsClient } from '../clients/azure-devops.client';
import {
  ListJiraProjectsResponseDto,
  ListGitHubReposResponseDto,
  ListClickUpListsResponseDto,
  ListAzureProjectsResponseDto,
} from '../dto/list-resources-response.dto';

@Injectable()
export class IntegrationListService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    private readonly jiraClient: JiraClient,
    private readonly githubClient: GitHubClient,
    private readonly clickupClient: ClickUpClient,
    private readonly azureDevOpsClient: AzureDevOpsClient,
  ) {}

  async listJiraProjects(organizationId: string): Promise<ListJiraProjectsResponseDto> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const jiraConfig = organization.integrations?.jira;
    if (!jiraConfig) {
      throw new NotFoundException('Jira integration not configured for this organization');
    }

    if (!jiraConfig.enabled) {
      throw new ForbiddenException('Jira integration is disabled');
    }

    const decryptedToken = decrypt(jiraConfig.apiToken);

    const projects = await this.jiraClient.listProjects({
      domain: jiraConfig.domain,
      email: jiraConfig.email,
      apiToken: decryptedToken,
    });

    return { projects };
  }

  async listGitHubRepos(organizationId: string): Promise<ListGitHubReposResponseDto> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const githubConfig = organization.integrations?.github;
    if (!githubConfig) {
      throw new NotFoundException('GitHub integration not configured for this organization');
    }

    if (!githubConfig.enabled) {
      throw new ForbiddenException('GitHub integration is disabled');
    }

    const decryptedToken = decrypt(githubConfig.token);

    const repositories = await this.githubClient.listRepositories({
      token: decryptedToken,
    });

    return { repositories };
  }

  async listClickUpLists(organizationId: string): Promise<ListClickUpListsResponseDto> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const clickupConfig = organization.integrations?.clickup;
    if (!clickupConfig) {
      throw new NotFoundException('ClickUp integration not configured for this organization');
    }

    if (!clickupConfig.enabled) {
      throw new ForbiddenException('ClickUp integration is disabled');
    }

    const decryptedToken = decrypt(clickupConfig.token);

    const lists = await this.clickupClient.listLists({
      token: decryptedToken,
    });

    return { lists };
  }

  async listAzureProjects(organizationId: string): Promise<ListAzureProjectsResponseDto> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    const azureConfig = organization.integrations?.azureDevops;
    if (!azureConfig) {
      throw new NotFoundException('Azure DevOps integration not configured for this organization');
    }

    if (!azureConfig.enabled) {
      throw new ForbiddenException('Azure DevOps integration is disabled');
    }

    const decryptedPat = decrypt(azureConfig.pat);

    const projects = await this.azureDevOpsClient.listProjects({
      organization: azureConfig.organization,
      pat: decryptedPat,
    });

    return { projects };
  }
}
