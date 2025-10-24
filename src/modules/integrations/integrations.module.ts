import { Module } from '@nestjs/common';
import { OrganizationIntegrationsController } from '@controllers/integrations/organization-integrations.controller';
import { RequirementImportsController } from '@controllers/integrations/requirement-imports.controller';
import { OrganizationIntegrationService } from '@application/integrations/use-cases/organization-integration.service';
import { IntegrationListService } from '@application/integrations/use-cases/integration-list.service';
import { JiraImportService } from '@application/integrations/use-cases/jira-import.service';
import { GitHubImportService } from '@application/integrations/use-cases/github-import.service';
import { ClickUpImportService } from '@application/integrations/use-cases/clickup-import.service';
import { AzureDevOpsImportService } from '@application/integrations/use-cases/azure-devops-import.service';
import { JiraClient } from '@application/integrations/clients/jira.client';
import { GitHubClient } from '@application/integrations/clients/github.client';
import { ClickUpClient } from '@application/integrations/clients/clickup.client';
import { AzureDevOpsClient } from '@application/integrations/clients/azure-devops.client';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { FPAModule } from '@modules/fpa/fpa.module';

@Module({
  imports: [OrganizationsModule, FPAModule],
  controllers: [
    OrganizationIntegrationsController,
    RequirementImportsController,
  ],
  providers: [
    OrganizationIntegrationService,
    IntegrationListService,
    JiraImportService,
    GitHubImportService,
    ClickUpImportService,
    AzureDevOpsImportService,
    JiraClient,
    GitHubClient,
    ClickUpClient,
    AzureDevOpsClient,
  ],
  exports: [
    OrganizationIntegrationService,
    IntegrationListService,
    JiraImportService,
    GitHubImportService,
    ClickUpImportService,
    AzureDevOpsImportService,
  ],
})
export class IntegrationsModule {}
