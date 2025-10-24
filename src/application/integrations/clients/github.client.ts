import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalIssue, GitHubConfig, TestConnectionResult } from '@domain/integrations/interfaces/integration-client.interface';
import { GitHubRepoDto } from '../dto/list-resources-response.dto';

@Injectable()
export class GitHubClient {
  async listRepositories(config: Pick<GitHubConfig, 'token'>): Promise<GitHubRepoDto[]> {
    const { token } = config;

    try {
      const repos: GitHubRepoDto[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText }));
          throw new BadRequestException(`GitHub API error: ${error.message || response.statusText}`);
        }

        const data = await response.json();

        if (data.length === 0) break;

        repos.push(...data.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
        })));

        if (data.length < perPage) break;
        page++;
      }

      return repos;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to list GitHub repositories: ${error.message}`);
    }
  }
  async fetchIssues(config: GitHubConfig): Promise<ExternalIssue[]> {
    const { token, owner, repo, state } = config;

    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=100`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new BadRequestException(`GitHub API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();

      const issues = data.filter((item: any) => !item.pull_request);

      return issues.map((issue: any) => ({
        id: issue.number.toString(),
        title: issue.title,
        description: issue.body || '',
        externalUrl: issue.html_url,
        metadata: {
          state: issue.state,
          labels: issue.labels?.map((l: any) => l.name) || [],
          assignees: issue.assignees?.map((a: any) => a.login) || [],
          created: issue.created_at,
          updated: issue.updated_at,
        },
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch GitHub issues: ${error.message}`);
    }
  }

  async testConnection(config: Pick<GitHubConfig, 'token'>): Promise<TestConnectionResult> {
    const { token } = config;

    try {
      const response = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: 'Invalid GitHub token',
          details: { statusCode: response.status },
        };
      }

      const userInfo = await response.json();

      return {
        success: true,
        message: 'GitHub connection successful',
        details: {
          user: {
            login: userInfo.login,
            name: userInfo.name,
            email: userInfo.email,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `GitHub connection failed: ${error.message}`,
      };
    }
  }
}
