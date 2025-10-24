export interface ExternalIssue {
  id: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  externalUrl?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: Array<{ item: string; error: string }>;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  jql: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  state: 'open' | 'closed' | 'all';
}

export interface ClickUpConfig {
  token: string;
  listId: string;
  includeClosed?: boolean;
}

export interface AzureDevOpsConfig {
  organization: string;
  project: string;
  pat: string;
  wiql: string;
}
