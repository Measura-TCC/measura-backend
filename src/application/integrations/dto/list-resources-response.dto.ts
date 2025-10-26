export class JiraProjectDto {
  id: string;
  key: string;
  name: string;
}

export class GitHubRepoDto {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
}

export class ClickUpSpaceDto {
  id: string;
  name: string;
}

export class ClickUpFolderDto {
  id: string;
  name: string;
}

export class ClickUpListDto {
  id: string;
  name: string;
  folderName?: string;
  spaceName?: string;
}

export class AzureProjectDto {
  id: string;
  name: string;
  description?: string;
}

export class ListJiraProjectsResponseDto {
  projects: JiraProjectDto[];
}

export class ListGitHubReposResponseDto {
  repositories: GitHubRepoDto[];
}

export class ListClickUpListsResponseDto {
  lists: ClickUpListDto[];
}

export class ListAzureProjectsResponseDto {
  projects: AzureProjectDto[];
}
