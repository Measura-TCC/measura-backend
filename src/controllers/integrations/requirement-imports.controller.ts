import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/utils/guards/jwt-auth.guard';
import { JiraImportService } from '@application/integrations/use-cases/jira-import.service';
import { GitHubImportService } from '@application/integrations/use-cases/github-import.service';
import { ClickUpImportService } from '@application/integrations/use-cases/clickup-import.service';
import { AzureDevOpsImportService } from '@application/integrations/use-cases/azure-devops-import.service';
import { ImportJiraRequirementsDto } from '@application/integrations/dtos/import-jira-requirements.dto';
import { ImportGitHubRequirementsDto } from '@application/integrations/dtos/import-github-requirements.dto';
import { ImportClickUpRequirementsDto } from '@application/integrations/dtos/import-clickup-requirements.dto';
import { ImportAzureDevOpsRequirementsDto } from '@application/integrations/dtos/import-azure-devops-requirements.dto';
import { ImportResultResponseDto } from '@application/integrations/dtos/import-result-response.dto';

@ApiTags('Requirement Imports')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RequirementImportsController {
  constructor(
    private readonly jiraImportService: JiraImportService,
    private readonly githubImportService: GitHubImportService,
    private readonly clickupImportService: ClickUpImportService,
    private readonly azureDevOpsImportService: AzureDevOpsImportService,
  ) {}

  @Post('jira/import-requirements')
  @ApiOperation({ summary: 'Import requirements from Jira' })
  @ApiResponse({ status: 201, description: 'Requirements imported successfully', type: ImportResultResponseDto })
  async importFromJira(@Body() dto: ImportJiraRequirementsDto) {
    const result = await this.jiraImportService.importRequirements(dto);

    const skippedItems = result.requirements
      .filter((_, index) => index >= result.imported)
      .map((req) => ({
        key: req.sourceReference || '',
        reason: 'Already exists in estimate',
      }));

    return {
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
        requirements: result.requirements,
        skippedItems: result.skipped > 0 ? skippedItems : undefined,
      },
    };
  }

  @Post('github/import-requirements')
  @ApiOperation({ summary: 'Import requirements from GitHub' })
  @ApiResponse({ status: 201, description: 'Requirements imported successfully', type: ImportResultResponseDto })
  async importFromGitHub(@Body() dto: ImportGitHubRequirementsDto) {
    const result = await this.githubImportService.importRequirements(dto);

    const skippedItems = result.requirements
      .filter((_, index) => index >= result.imported)
      .map((req) => ({
        key: req.sourceReference || '',
        reason: 'Already exists in estimate',
      }));

    return {
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
        requirements: result.requirements,
        skippedItems: result.skipped > 0 ? skippedItems : undefined,
      },
    };
  }

  @Post('clickup/import-requirements')
  @ApiOperation({ summary: 'Import requirements from ClickUp' })
  @ApiResponse({ status: 201, description: 'Requirements imported successfully', type: ImportResultResponseDto })
  async importFromClickUp(@Body() dto: ImportClickUpRequirementsDto) {
    const result = await this.clickupImportService.importRequirements(dto);

    const skippedItems = result.requirements
      .filter((_, index) => index >= result.imported)
      .map((req) => ({
        key: req.sourceReference || '',
        reason: 'Already exists in estimate',
      }));

    return {
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
        requirements: result.requirements,
        skippedItems: result.skipped > 0 ? skippedItems : undefined,
      },
    };
  }

  @Post('azure-devops/import-requirements')
  @ApiOperation({ summary: 'Import requirements from Azure DevOps' })
  @ApiResponse({ status: 201, description: 'Requirements imported successfully', type: ImportResultResponseDto })
  async importFromAzureDevOps(@Body() dto: ImportAzureDevOpsRequirementsDto) {
    const result = await this.azureDevOpsImportService.importRequirements(dto);

    const skippedItems = result.requirements
      .filter((_, index) => index >= result.imported)
      .map((req) => ({
        key: req.sourceReference || '',
        reason: 'Already exists in estimate',
      }));

    return {
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
        requirements: result.requirements,
        skippedItems: result.skipped > 0 ? skippedItems : undefined,
      },
    };
  }
}
