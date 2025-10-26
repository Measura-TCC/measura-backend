import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalIssue, AzureDevOpsConfig, TestConnectionResult } from '@domain/integrations/interfaces/integration-client.interface';
import { stripHtml } from '@shared/utils/parsers/html-parser.util';
import { AzureProjectDto } from '../dto/list-resources-response.dto';

@Injectable()
export class AzureDevOpsClient {
  async listProjects(config: Pick<AzureDevOpsConfig, 'organization' | 'pat'>): Promise<AzureProjectDto[]> {
    const { organization, pat } = config;
    const auth = Buffer.from(`:${pat}`).toString('base64');

    try {
      const response = await fetch(
        `https://dev.azure.com/${organization}/_apis/projects?api-version=7.1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new BadRequestException(`Azure DevOps API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();

      return data.value.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to list Azure DevOps projects: ${error.message}`);
    }
  }
  async fetchIssues(config: AzureDevOpsConfig): Promise<ExternalIssue[]> {
    const { organization, project, pat, wiql } = config;
    const auth = Buffer.from(`:${pat}`).toString('base64');

    try {
      const wiqlResponse = await fetch(
        `https://dev.azure.com/${organization}/${project}/_apis/wit/wiql?api-version=7.1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: wiql }),
        },
      );

      if (!wiqlResponse.ok) {
        const error = await wiqlResponse.json().catch(() => ({ message: wiqlResponse.statusText }));
        throw new BadRequestException(`Azure DevOps WIQL error: ${error.message || wiqlResponse.statusText}`);
      }

      const wiqlData = await wiqlResponse.json();
      const workItemIds = wiqlData.workItems?.map((wi: any) => wi.id) || [];

      if (workItemIds.length === 0) {
        return [];
      }

      const batchSize = 200;
      const allWorkItems: any[] = [];

      for (let i = 0; i < workItemIds.length; i += batchSize) {
        const batch = workItemIds.slice(i, i + batchSize);
        const ids = batch.join(',');

        const workItemsResponse = await fetch(
          `https://dev.azure.com/${organization}/_apis/wit/workitems?ids=${ids}&api-version=7.1`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
            },
          },
        );

        if (!workItemsResponse.ok) {
          const error = await workItemsResponse.json().catch(() => ({ message: workItemsResponse.statusText }));
          throw new BadRequestException(`Azure DevOps work items error: ${error.message || workItemsResponse.statusText}`);
        }

        const workItemsData = await workItemsResponse.json();
        allWorkItems.push(...(workItemsData.value || []));
      }

      return allWorkItems.map((wi: any) => ({
        id: wi.id.toString(),
        title: wi.fields['System.Title'],
        description: stripHtml(wi.fields['System.Description'] || ''),
        externalUrl: `https://dev.azure.com/${organization}/${project}/_workitems/edit/${wi.id}`,
        metadata: {
          workItemType: wi.fields['System.WorkItemType'],
          state: wi.fields['System.State'],
          assignedTo: wi.fields['System.AssignedTo']?.displayName,
          created: wi.fields['System.CreatedDate'],
          updated: wi.fields['System.ChangedDate'],
        },
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch Azure DevOps work items: ${error.message}`);
    }
  }

  async testConnection(config: Pick<AzureDevOpsConfig, 'organization' | 'pat'>): Promise<TestConnectionResult> {
    const { organization, pat } = config;
    const auth = Buffer.from(`:${pat}`).toString('base64');

    try {
      const response = await fetch(
        `https://dev.azure.com/${organization}/_apis/projects?api-version=7.1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        },
      );

      if (!response.ok) {
        return {
          success: false,
          message: 'Invalid Azure DevOps credentials or organization',
          details: { statusCode: response.status },
        };
      }

      const data = await response.json();

      return {
        success: true,
        message: 'Azure DevOps connection successful',
        details: {
          organization,
          projectCount: data.count,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Azure DevOps connection failed: ${error.message}`,
      };
    }
  }
}
