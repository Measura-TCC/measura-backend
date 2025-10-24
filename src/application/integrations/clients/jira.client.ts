import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalIssue, JiraConfig, TestConnectionResult } from '@domain/integrations/interfaces/integration-client.interface';
import { adfToPlainText } from '@shared/utils/parsers/adf-parser.util';
import { JiraProjectDto } from '../dto/list-resources-response.dto';

@Injectable()
export class JiraClient {
  async listProjects(config: Omit<JiraConfig, 'jql'>): Promise<JiraProjectDto[]> {
    const { domain, email, apiToken } = config;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    try {
      const response = await fetch(`https://${domain}/rest/api/3/project/search`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new BadRequestException(`Jira API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();

      return data.values.map((project: any) => ({
        id: project.id,
        key: project.key,
        name: project.name,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to list Jira projects: ${error.message}`);
    }
  }
  async fetchIssues(config: JiraConfig): Promise<ExternalIssue[]> {
    const { domain, email, apiToken, jql } = config;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    try {
      const response = await fetch(`https://${domain}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql,
          maxResults: 1000,
          fields: ['summary', 'description', 'status', 'issuetype', 'priority', 'created', 'updated'],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new BadRequestException(`Jira API error: ${error.message || error.errorMessages?.join(', ') || response.statusText}`);
      }

      const data = await response.json();

      return data.issues.map((issue: any) => ({
        id: issue.key,
        title: issue.fields.summary,
        description: adfToPlainText(issue.fields.description),
        externalUrl: `https://${domain}/browse/${issue.key}`,
        metadata: {
          issueType: issue.fields.issuetype?.name,
          status: issue.fields.status?.name,
          priority: issue.fields.priority?.name,
          created: issue.fields.created,
          updated: issue.fields.updated,
        },
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch Jira issues: ${error.message}`);
    }
  }

  async testConnection(config: Omit<JiraConfig, 'jql'>): Promise<TestConnectionResult> {
    const { domain, email, apiToken } = config;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    try {
      const serverInfoResponse = await fetch(`https://${domain}/rest/api/3/serverInfo`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      if (!serverInfoResponse.ok) {
        return {
          success: false,
          message: 'Invalid Jira credentials or domain',
          details: { statusCode: serverInfoResponse.status },
        };
      }

      const serverInfo = await serverInfoResponse.json();

      const myselfResponse = await fetch(`https://${domain}/rest/api/3/myself`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      const userInfo = myselfResponse.ok ? await myselfResponse.json() : null;

      return {
        success: true,
        message: 'Jira connection successful',
        details: {
          serverInfo: {
            version: serverInfo.version,
            deploymentType: serverInfo.deploymentType,
          },
          userInfo: userInfo ? {
            displayName: userInfo.displayName,
            emailAddress: userInfo.emailAddress,
          } : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Jira connection failed: ${error.message}`,
      };
    }
  }
}
