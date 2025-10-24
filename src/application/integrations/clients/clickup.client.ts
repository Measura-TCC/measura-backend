import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalIssue, ClickUpConfig, TestConnectionResult } from '@domain/integrations/interfaces/integration-client.interface';
import { ClickUpListDto, ClickUpSpaceDto, ClickUpFolderDto } from '../dto/list-resources-response.dto';

@Injectable()
export class ClickUpClient {
  async listLists(config: Pick<ClickUpConfig, 'token'>): Promise<ClickUpListDto[]> {
    const { token } = config;

    try {
      const teamsResponse = await fetch('https://api.clickup.com/api/v2/team', {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (!teamsResponse.ok) {
        const error = await teamsResponse.json().catch(() => ({ err: teamsResponse.statusText }));
        throw new BadRequestException(`ClickUp API error: ${error.err || teamsResponse.statusText}`);
      }

      const teamsData = await teamsResponse.json();
      const allLists: ClickUpListDto[] = [];

      for (const team of teamsData.teams) {
        const spacesResponse = await fetch(`https://api.clickup.com/api/v2/team/${team.id}/space`, {
          method: 'GET',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });

        if (!spacesResponse.ok) continue;

        const spacesData = await spacesResponse.json();

        for (const space of spacesData.spaces) {
          const foldersResponse = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder`, {
            method: 'GET',
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json',
            },
          });

          if (foldersResponse.ok) {
            const foldersData = await foldersResponse.json();

            for (const folder of foldersData.folders) {
              const listsResponse = await fetch(`https://api.clickup.com/api/v2/folder/${folder.id}/list`, {
                method: 'GET',
                headers: {
                  'Authorization': token,
                  'Content-Type': 'application/json',
                },
              });

              if (listsResponse.ok) {
                const listsData = await listsResponse.json();
                allLists.push(...listsData.lists.map((list: any) => ({
                  id: list.id,
                  name: list.name,
                  folderName: folder.name,
                  spaceName: space.name,
                })));
              }
            }
          }

          const folderlessListsResponse = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
            method: 'GET',
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json',
            },
          });

          if (folderlessListsResponse.ok) {
            const folderlessListsData = await folderlessListsResponse.json();
            allLists.push(...folderlessListsData.lists.map((list: any) => ({
              id: list.id,
              name: list.name,
              spaceName: space.name,
            })));
          }
        }
      }

      return allLists;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to list ClickUp lists: ${error.message}`);
    }
  }
  async fetchIssues(config: ClickUpConfig): Promise<ExternalIssue[]> {
    const { token, listId, includeClosed } = config;
    const allTasks: any[] = [];
    let page = 0;
    const limit = 100;

    try {
      while (true) {
        const url = new URL(`https://api.clickup.com/api/v2/list/${listId}/task`);
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', limit.toString());
        if (includeClosed) {
          url.searchParams.append('include_closed', 'true');
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ err: response.statusText }));
          throw new BadRequestException(`ClickUp API error: ${error.err || response.statusText}`);
        }

        const data = await response.json();
        allTasks.push(...data.tasks);

        if (data.tasks.length < limit) {
          break;
        }

        page++;
      }

      return allTasks.map((task: any) => ({
        id: task.id,
        title: task.name,
        description: task.description || '',
        externalUrl: task.url,
        metadata: {
          status: task.status?.status,
          priority: task.priority?.priority,
          dueDate: task.due_date,
          created: task.date_created,
          updated: task.date_updated,
        },
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch ClickUp tasks: ${error.message}`);
    }
  }

  async testConnection(config: Pick<ClickUpConfig, 'token'>): Promise<TestConnectionResult> {
    const { token } = config;

    try {
      const response = await fetch('https://api.clickup.com/api/v2/user', {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: 'Invalid ClickUp token',
          details: { statusCode: response.status },
        };
      }

      const data = await response.json();

      return {
        success: true,
        message: 'ClickUp connection successful',
        details: {
          user: {
            username: data.user?.username,
            email: data.user?.email,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `ClickUp connection failed: ${error.message}`,
      };
    }
  }
}
