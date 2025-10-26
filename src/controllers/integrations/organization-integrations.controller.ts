import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/utils/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/utils/guards/roles.guard';
import { Roles } from '@shared/utils/decorators/roles.decorator';
import { UserRole } from '@domain/users/entities/user.entity';
import { OrganizationIntegrationService } from '@application/integrations/use-cases/organization-integration.service';
import { IntegrationListService } from '@application/integrations/use-cases/integration-list.service';
import { ConfigureJiraDto } from '@application/integrations/dtos/configure-jira.dto';
import { ConfigureGitHubDto } from '@application/integrations/dtos/configure-github.dto';
import { ConfigureClickUpDto } from '@application/integrations/dtos/configure-clickup.dto';
import { ConfigureAzureDevOpsDto } from '@application/integrations/dtos/configure-azure-devops.dto';
import { UpdateIntegrationDto } from '@application/integrations/dtos/update-integration.dto';
import { TestConnectionResponseDto } from '@application/integrations/dtos/test-connection-response.dto';
import { JiraClient } from '@application/integrations/clients/jira.client';
import { GitHubClient } from '@application/integrations/clients/github.client';
import { ClickUpClient } from '@application/integrations/clients/clickup.client';
import { AzureDevOpsClient } from '@application/integrations/clients/azure-devops.client';

interface AuthenticatedRequest {
  user: {
    _id: string;
    email: string;
    role: UserRole;
  };
}

@ApiTags('Organization Integrations')
@Controller('organizations/:organizationId/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationIntegrationsController {
  constructor(
    private readonly integrationService: OrganizationIntegrationService,
    private readonly integrationListService: IntegrationListService,
    private readonly jiraClient: JiraClient,
    private readonly githubClient: GitHubClient,
    private readonly clickupClient: ClickUpClient,
    private readonly azureDevOpsClient: AzureDevOpsClient,
  ) {}

  @Post('jira')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Configure Jira integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Jira integration configured' })
  async configureJira(
    @Param('organizationId') organizationId: string,
    @Body() dto: ConfigureJiraDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const integration = await this.integrationService.configureJira(
      organizationId,
      req.user._id,
      dto,
    );
    return {
      success: true,
      message: 'Jira integration configured successfully',
      integration,
    };
  }

  @Put('jira')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update Jira integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Jira integration updated' })
  async updateJira(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    await this.integrationService.updateIntegration(
      organizationId,
      'jira',
      dto.enabled!,
    );
    return {
      success: true,
      message: 'Jira integration updated successfully',
    };
  }

  @Delete('jira')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Remove Jira integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Jira integration removed' })
  async removeJira(@Param('organizationId') organizationId: string) {
    await this.integrationService.deleteIntegration(organizationId, 'jira');
    return {
      success: true,
      message: 'Jira integration removed successfully',
    };
  }

  @Get('jira/test')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Test Jira connection (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Connection test result', type: TestConnectionResponseDto })
  async testJira(@Param('organizationId') organizationId: string) {
    const integration = await this.integrationService.getIntegration(
      organizationId,
      'jira',
    );
    const decryptedToken = this.integrationService.decryptToken((integration as any).apiToken);
    return await this.jiraClient.testConnection({
      domain: (integration as any).domain,
      email: (integration as any).email,
      apiToken: decryptedToken,
    });
  }

  @Post('github')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Configure GitHub integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'GitHub integration configured' })
  async configureGitHub(
    @Param('organizationId') organizationId: string,
    @Body() dto: ConfigureGitHubDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const integration = await this.integrationService.configureGitHub(
      organizationId,
      req.user._id,
      dto,
    );
    return {
      success: true,
      message: 'GitHub integration configured successfully',
      integration,
    };
  }

  @Put('github')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update GitHub integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'GitHub integration updated' })
  async updateGitHub(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    await this.integrationService.updateIntegration(
      organizationId,
      'github',
      dto.enabled!,
    );
    return {
      success: true,
      message: 'GitHub integration updated successfully',
    };
  }

  @Delete('github')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Remove GitHub integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'GitHub integration removed' })
  async removeGitHub(@Param('organizationId') organizationId: string) {
    await this.integrationService.deleteIntegration(organizationId, 'github');
    return {
      success: true,
      message: 'GitHub integration removed successfully',
    };
  }

  @Get('github/test')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Test GitHub connection (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Connection test result', type: TestConnectionResponseDto })
  async testGitHub(@Param('organizationId') organizationId: string) {
    const integration = await this.integrationService.getIntegration(
      organizationId,
      'github',
    );
    const decryptedToken = this.integrationService.decryptToken((integration as any).token);
    return await this.githubClient.testConnection({ token: decryptedToken });
  }

  @Post('clickup')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Configure ClickUp integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'ClickUp integration configured' })
  async configureClickUp(
    @Param('organizationId') organizationId: string,
    @Body() dto: ConfigureClickUpDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const integration = await this.integrationService.configureClickUp(
      organizationId,
      req.user._id,
      dto,
    );
    return {
      success: true,
      message: 'ClickUp integration configured successfully',
      integration,
    };
  }

  @Put('clickup')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update ClickUp integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'ClickUp integration updated' })
  async updateClickUp(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    await this.integrationService.updateIntegration(
      organizationId,
      'clickup',
      dto.enabled!,
    );
    return {
      success: true,
      message: 'ClickUp integration updated successfully',
    };
  }

  @Delete('clickup')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Remove ClickUp integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'ClickUp integration removed' })
  async removeClickUp(@Param('organizationId') organizationId: string) {
    await this.integrationService.deleteIntegration(organizationId, 'clickup');
    return {
      success: true,
      message: 'ClickUp integration removed successfully',
    };
  }

  @Get('clickup/test')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Test ClickUp connection (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Connection test result', type: TestConnectionResponseDto })
  async testClickUp(@Param('organizationId') organizationId: string) {
    const integration = await this.integrationService.getIntegration(
      organizationId,
      'clickup',
    );
    const decryptedToken = this.integrationService.decryptToken((integration as any).token);
    return await this.clickupClient.testConnection({ token: decryptedToken });
  }

  @Post('azure-devops')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Configure Azure DevOps integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Azure DevOps integration configured' })
  async configureAzureDevOps(
    @Param('organizationId') organizationId: string,
    @Body() dto: ConfigureAzureDevOpsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const integration = await this.integrationService.configureAzureDevOps(
      organizationId,
      req.user._id,
      dto,
    );
    return {
      success: true,
      message: 'Azure DevOps integration configured successfully',
      integration,
    };
  }

  @Put('azure-devops')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update Azure DevOps integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Azure DevOps integration updated' })
  async updateAzureDevOps(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    await this.integrationService.updateIntegration(
      organizationId,
      'azureDevops',
      dto.enabled!,
    );
    return {
      success: true,
      message: 'Azure DevOps integration updated successfully',
    };
  }

  @Delete('azure-devops')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Remove Azure DevOps integration (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Azure DevOps integration removed' })
  async removeAzureDevOps(@Param('organizationId') organizationId: string) {
    await this.integrationService.deleteIntegration(organizationId, 'azureDevops');
    return {
      success: true,
      message: 'Azure DevOps integration removed successfully',
    };
  }

  @Get('azure-devops/test')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Test Azure DevOps connection (Admin/Project Manager)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Connection test result', type: TestConnectionResponseDto })
  async testAzureDevOps(@Param('organizationId') organizationId: string) {
    const integration = await this.integrationService.getIntegration(
      organizationId,
      'azureDevops',
    );
    const decryptedPat = this.integrationService.decryptToken((integration as any).pat);
    return await this.azureDevOpsClient.testConnection({
      organization: (integration as any).organization,
      pat: decryptedPat,
    });
  }

  @Get('jira/projects')
  @ApiOperation({ summary: 'List all available Jira projects' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of Jira projects' })
  async listJiraProjects(@Param('organizationId') organizationId: string) {
    return await this.integrationListService.listJiraProjects(organizationId);
  }

  @Get('github/repositories')
  @ApiOperation({ summary: 'List all available GitHub repositories' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of GitHub repositories' })
  async listGitHubRepos(@Param('organizationId') organizationId: string) {
    return await this.integrationListService.listGitHubRepos(organizationId);
  }

  @Get('clickup/lists')
  @ApiOperation({ summary: 'List all available ClickUp lists' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of ClickUp lists' })
  async listClickUpLists(@Param('organizationId') organizationId: string) {
    return await this.integrationListService.listClickUpLists(organizationId);
  }

  @Get('azure-devops/projects')
  @ApiOperation({ summary: 'List all available Azure DevOps projects' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of Azure DevOps projects' })
  async listAzureProjects(@Param('organizationId') organizationId: string) {
    return await this.integrationListService.listAzureProjects(organizationId);
  }
}
