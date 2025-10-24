# Frontend Integration Guide - Requirements Import System

Complete guide for integrating the Requirements Import System into the Measura frontend application.

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [Integration Workflow](#integration-workflow)
4. [API Request/Response Examples](#api-request-response-examples)
5. [UI/UX Recommendations](#uiux-recommendations)
6. [Error Handling](#error-handling)
7. [TypeScript Types](#typescript-types)
8. [Step-by-Step Implementation](#step-by-step-implementation)

---

## Overview

The Requirements Import System allows organizations to connect external project management tools (Jira, GitHub, ClickUp, Azure DevOps) and import issues/tasks as requirements into FPA estimates.

### Key Features

- **Organization-level configuration** - Admin users configure integrations once for the entire organization
- **Secure credential storage** - AES-256-GCM encryption with masked display
- **All users can import** - Once configured, any organization member can import requirements
- **Duplicate detection** - Automatically skips already-imported requirements
- **Resource browsing** - List available projects/repositories before importing

---

## API Endpoints Reference

### Base URL
```
http://localhost:8081
```

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Integration Configuration Endpoints

### 1. Configure Jira Integration

**Admin Only**

```http
POST /organizations/:organizationId/integrations/jira
```

**Request Body:**
```json
{
  "domain": "company.atlassian.net",
  "email": "admin@company.com",
  "apiToken": "ATATT3xFfGF0...",
  "enabled": true
}
```

**Response (201):**
```json
{
  "_id": "68c8750f70b5c520bf74c6db",
  "name": "Acme Corp",
  "integrations": {
    "jira": {
      "domain": "company.atlassian.net",
      "email": "admin@company.com",
      "apiToken": "••••••••",
      "enabled": true,
      "configuredBy": "68c87508e2f9a1b3c4d5e6f7",
      "configuredAt": "2025-10-24T18:00:00.000Z"
    }
  }
}
```

---

### 2. Configure GitHub Integration

**Admin Only**

```http
POST /organizations/:organizationId/integrations/github
```

**Request Body:**
```json
{
  "token": "ghp_1234567890abcdefghijklmnopqrstuvwxyz",
  "enabled": true
}
```

**Response (201):**
```json
{
  "_id": "68c8750f70b5c520bf74c6db",
  "integrations": {
    "github": {
      "token": "••••••••",
      "enabled": true,
      "configuredBy": "68c87508e2f9a1b3c4d5e6f7",
      "configuredAt": "2025-10-24T18:00:00.000Z"
    }
  }
}
```

---

### 3. Configure ClickUp Integration

**Admin Only**

```http
POST /organizations/:organizationId/integrations/clickup
```

**Request Body:**
```json
{
  "token": "pk_1234567_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "enabled": true
}
```

**Response (201):**
```json
{
  "_id": "68c8750f70b5c520bf74c6db",
  "integrations": {
    "clickup": {
      "token": "••••••••",
      "enabled": true,
      "configuredBy": "68c87508e2f9a1b3c4d5e6f7",
      "configuredAt": "2025-10-24T18:00:00.000Z"
    }
  }
}
```

---

### 4. Configure Azure DevOps Integration

**Admin Only**

```http
POST /organizations/:organizationId/integrations/azure-devops
```

**Request Body:**
```json
{
  "organization": "your-azure-org",
  "pat": "abcdefghijklmnopqrstuvwxyz1234567890",
  "enabled": true
}
```

**Response (201):**
```json
{
  "_id": "68c8750f70b5c520bf74c6db",
  "integrations": {
    "azureDevops": {
      "organization": "your-azure-org",
      "pat": "••••••••",
      "enabled": true,
      "configuredBy": "68c87508e2f9a1b3c4d5e6f7",
      "configuredAt": "2025-10-24T18:00:00.000Z"
    }
  }
}
```

---

## Update/Delete Integration Endpoints

### Update Integration

**Admin Only**

```http
PUT /organizations/:organizationId/integrations/{jira|github|clickup|azure-devops}
```

**Request Body (example for Jira):**
```json
{
  "enabled": false
}
```

**Response (200):**
```json
{
  "message": "Jira integration updated successfully"
}
```

---

### Delete Integration

**Admin Only**

```http
DELETE /organizations/:organizationId/integrations/{jira|github|clickup|azure-devops}
```

**Response (200):**
```json
{
  "message": "Jira integration removed successfully"
}
```

---

## Test Connection Endpoints

### Test Jira Connection

**Admin Only**

```http
GET /organizations/:organizationId/integrations/jira/test
```

**Response (200):**
```json
{
  "success": true,
  "message": "Jira connection successful",
  "details": {
    "serverInfo": {
      "version": "1001.0.0-SNAPSHOT",
      "deploymentType": "Cloud"
    },
    "userInfo": {
      "displayName": "John Doe",
      "emailAddress": "john@company.com"
    }
  }
}
```

---

### Test GitHub Connection

**Admin Only**

```http
GET /organizations/:organizationId/integrations/github/test
```

**Response (200):**
```json
{
  "success": true,
  "message": "GitHub connection successful",
  "details": {
    "user": {
      "login": "johndoe",
      "name": "John Doe",
      "email": "john@company.com"
    }
  }
}
```

---

### Test ClickUp Connection

**Admin Only**

```http
GET /organizations/:organizationId/integrations/clickup/test
```

**Response (200):**
```json
{
  "success": true,
  "message": "ClickUp connection successful",
  "details": {
    "user": {
      "username": "John Doe",
      "email": "john@company.com"
    }
  }
}
```

---

### Test Azure DevOps Connection

**Admin Only**

```http
GET /organizations/:organizationId/integrations/azure-devops/test
```

**Response (200):**
```json
{
  "success": true,
  "message": "Azure DevOps connection successful",
  "details": {
    "organization": "your-azure-org",
    "projectCount": 15
  }
}
```

---

## List Resources Endpoints

### List Jira Projects

**All Users**

```http
GET /organizations/:organizationId/integrations/jira/projects
```

**Response (200):**
```json
{
  "projects": [
    {
      "id": "10000",
      "key": "PROJ",
      "name": "Project Name"
    },
    {
      "id": "10001",
      "key": "MEAS",
      "name": "Measura"
    }
  ]
}
```

---

### List GitHub Repositories

**All Users**

```http
GET /organizations/:organizationId/integrations/github/repositories
```

**Response (200):**
```json
{
  "repositories": [
    {
      "id": 123456789,
      "name": "measura-backend",
      "fullName": "Measura-TCC/measura-backend",
      "description": "Backend for Measura FPA tool",
      "isPrivate": false
    }
  ]
}
```

---

### List ClickUp Lists

**All Users**

```http
GET /organizations/:organizationId/integrations/clickup/lists
```

**Response (200):**
```json
{
  "lists": [
    {
      "id": "901321632641",
      "name": "Project Tasks",
      "spaceName": "Development",
      "folderName": "Sprint 1"
    }
  ]
}
```

---

### List Azure DevOps Projects

**All Users**

```http
GET /organizations/:organizationId/integrations/azure-devops/projects
```

**Response (200):**
```json
{
  "projects": [
    {
      "id": "abc-123-def",
      "name": "My Azure Project",
      "description": "Project description",
      "state": "wellFormed"
    }
  ]
}
```

---

## Import Requirements Endpoints

### Import from Jira

**All Users**

```http
POST /integrations/jira/import-requirements
```

**Request Body:**
```json
{
  "organizationId": "68c8750f70b5c520bf74c6db",
  "projectId": "68c8751a70b5c520bf74c6e1",
  "estimateId": "68f4522156869...",
  "jql": "project = MEAS AND status = 'To Do'"
}
```

**JQL Examples:**
```
"project = PROJ"
"project = PROJ AND status = Open"
"project = PROJ AND type = Story"
"project = PROJ AND assignee = currentUser()"
"project = PROJ AND created >= -7d"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": 3,
    "skipped": 0,
    "failed": 0,
    "requirements": [
      {
        "_id": "68fbc5c4b472e4e33a8a8d5c",
        "title": "Test requirement from Measura API",
        "description": "This is a test requirement created via Jira API...",
        "source": "jira",
        "sourceReference": "MEAS-3",
        "sourceMetadata": {
          "issueType": "Task",
          "status": "To Do",
          "priority": "Medium",
          "created": "2025-10-24T15:25:33.720-0300",
          "updated": "2025-10-24T15:25:33.850-0300",
          "externalUrl": "https://company.atlassian.net/browse/MEAS-3"
        },
        "estimateId": "68fbc5bcb472e4e33a8a8d35",
        "organizationId": "68fbc5bcb472e4e33a8a8d2c",
        "projectId": "68fbc5bcb472e4e33a8a8d31",
        "createdAt": "2025-10-24T18:30:28.769Z",
        "updatedAt": "2025-10-24T18:30:28.769Z"
      }
    ]
  }
}
```

---

### Import from GitHub

**All Users**

```http
POST /integrations/github/import-requirements
```

**Request Body:**
```json
{
  "organizationId": "68c8750f70b5c520bf74c6db",
  "projectId": "68c8751a70b5c520bf74c6e1",
  "estimateId": "68f4522156869...",
  "owner": "Measura-TCC",
  "repo": "measura-backend",
  "state": "open"
}
```

**State Options:** `"open"`, `"closed"`, `"all"`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": 5,
    "skipped": 2,
    "failed": 0,
    "requirements": [...]
  }
}
```

---

### Import from ClickUp

**All Users**

```http
POST /integrations/clickup/import-requirements
```

**Request Body:**
```json
{
  "organizationId": "68c8750f70b5c520bf74c6db",
  "projectId": "68c8751a70b5c520bf74c6e1",
  "estimateId": "68f4522156869...",
  "listId": "901321632641"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": 3,
    "skipped": 0,
    "failed": 0,
    "requirements": [...]
  }
}
```

---

### Import from Azure DevOps

**All Users**

```http
POST /integrations/azure-devops/import-requirements
```

**Request Body:**
```json
{
  "organizationId": "68c8750f70b5c520bf74c6db",
  "projectId": "68c8751a70b5c520bf74c6e1",
  "estimateId": "68f4522156869...",
  "project": "My Azure Project",
  "wiql": "SELECT [System.Id] FROM workitems WHERE [System.WorkItemType] = 'User Story'"
}
```

**WIQL Examples:**
```
"SELECT [System.Id] FROM workitems WHERE [System.WorkItemType] = 'User Story'"
"SELECT [System.Id] FROM workitems WHERE [System.State] = 'Active'"
"SELECT [System.Id] FROM workitems WHERE [System.AreaPath] = 'MyProject\\Area1'"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": 7,
    "skipped": 1,
    "failed": 0,
    "requirements": [...]
  }
}
```

---

## Integration Workflow

### Phase 1: Configuration (Admin Only)

1. **Navigate to Organization Settings** → Integrations
2. **Select Integration Type** (Jira, GitHub, ClickUp, or Azure DevOps)
3. **Enter Credentials**:
   - Jira: Domain, Email, API Token
   - GitHub: Personal Access Token
   - ClickUp: API Token
   - Azure DevOps: Organization Name, Personal Access Token
4. **Test Connection** - Click "Test Connection" button
5. **Save Configuration** - Credentials are encrypted and stored

### Phase 2: Import (All Users)

1. **Navigate to Estimate** → Requirements
2. **Click "Import from External Source"**
3. **Select Integration** (only enabled integrations shown)
4. **Browse Resources**:
   - Jira: List available projects
   - GitHub: List repositories
   - ClickUp: List spaces/folders/lists
   - Azure DevOps: List projects
5. **Configure Import**:
   - Jira: Enter JQL query or use builder
   - GitHub: Select repository and state filter
   - ClickUp: Select list
   - Azure DevOps: Select project and enter WIQL query
6. **Preview (Optional)** - Show count of matching items
7. **Import** - Start import process
8. **Review Results** - Display imported/skipped/failed counts

---

## UI/UX Recommendations

### Integration Settings Page (Admin Only)

```
┌─────────────────────────────────────────────────────────┐
│ Organization Settings > Integrations                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Connected Integrations                                  │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │ [Jira Logo]  Jira                        │           │
│  │                                          │           │
│  │ Domain: company.atlassian.net    [Edit]  │           │
│  │ Status: ● Active                [Delete] │           │
│  │ Last used: 2 hours ago      [Test Connection]       │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │ [GitHub Logo]  GitHub                    │           │
│  │                                          │           │
│  │ Status: ○ Not Configured    [+ Configure]│           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  Available Integrations                                  │
│                                                          │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                                │
│  │[C]│ │[A]│ │[T]│ │[L]│                                │
│  │lU │ │zD │ │rel│ │in │                                │
│  │ p │ │ vO│ │lo │ │ar │  (Coming Soon)                │
│  └───┘ └───┘ └───┘ └───┘                                │
└─────────────────────────────────────────────────────────┘
```

---

### Configure Jira Modal

```
┌─────────────────────────────────────────────────────┐
│ Configure Jira Integration                    [X]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Jira Domain *                                       │
│  ┌────────────────────────────────────────────┐     │
│  │ company.atlassian.net                      │     │
│  └────────────────────────────────────────────┘     │
│  Example: mycompany.atlassian.net (without https)   │
│                                                      │
│  Email *                                             │
│  ┌────────────────────────────────────────────┐     │
│  │ admin@company.com                          │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  API Token *                                         │
│  ┌────────────────────────────────────────────┐     │
│  │ ••••••••••••••••••••••••••••••••          │     │
│  └────────────────────────────────────────────┘     │
│  [How to generate API token?]                       │
│                                                      │
│  ☑ Enable integration                               │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Test & Save  │  │    Cancel    │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

### Import Requirements Page

```
┌─────────────────────────────────────────────────────────┐
│ Estimate: Mobile App v2.0 > Requirements                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [+ Add Requirement ▼]                                   │
│     └─ Manually                                          │
│     └─ Import from Jira                                  │
│     └─ Import from GitHub                                │
│     └─ Import from ClickUp                               │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ Search requirements...              [Filter ▼]│     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Requirements (23)                                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ REQ-001  User Login                            │     │
│  │ Source: Manual                                 │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ [Jira] PROJ-123  Password Reset Feature        │     │
│  │ Source: Jira • Story • To Do                   │     │
│  │ [View in Jira ↗]                               │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ [GitHub] #45  API Rate Limiting                │     │
│  │ Source: GitHub • Enhancement • Open            │     │
│  │ [View on GitHub ↗]                             │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

### Import from Jira Modal

```
┌─────────────────────────────────────────────────────┐
│ Import Requirements from Jira                 [X]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Step 1: Select Project                              │
│  ┌────────────────────────────────────────────┐     │
│  │ ● PROJ - Project Name                      │     │
│  │ ○ MEAS - Measura                           │     │
│  │ ○ DEV  - Development Team                  │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Step 2: Filter Issues (JQL)                         │
│  ┌────────────────────────────────────────────┐     │
│  │ project = PROJ AND status = 'To Do'        │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Common filters:                                     │
│  • All open issues                                   │
│  • Stories only                                      │
│  • Current sprint                                    │
│  • Assigned to me                                    │
│  [Custom JQL]                                        │
│                                                      │
│  Preview: 15 issues will be imported                 │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │    Import    │  │    Cancel    │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

### Import Progress & Results

```
┌─────────────────────────────────────────────────────┐
│ Import in Progress...                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Importing from Jira...                              │
│  ████████████████░░░░░░░░░░░░  60%                  │
│                                                      │
│  Imported: 9/15                                      │
│  Skipped: 0 (duplicates)                             │
│  Failed: 0                                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Import Complete!                              [X]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ✓ Successfully imported 15 requirements            │
│  ℹ 3 requirements were skipped (already imported)   │
│  ✗ 0 requirements failed to import                  │
│                                                      │
│  New Requirements:                                   │
│  • PROJ-123 - User authentication                   │
│  • PROJ-124 - Password reset                        │
│  • PROJ-125 - Email verification                    │
│  ... and 12 more                                    │
│                                                      │
│  ┌──────────────┐                                   │
│  │     Done     │                                   │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Invalid Parameters
```json
{
  "message": ["jql must be a string", "jql should not be empty"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**UI Action:** Display validation errors inline on the form

---

#### 401 Unauthorized - Invalid/Expired Token
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**UI Action:** Redirect to login page

---

#### 403 Forbidden - Insufficient Permissions
```json
{
  "message": "You must be an admin to configure integrations",
  "error": "Forbidden",
  "statusCode": 403
}
```

**UI Action:** Display error message: "Admin permissions required"

---

#### 404 Not Found - Integration Not Configured
```json
{
  "message": "Jira integration not found for this organization",
  "error": "Not Found",
  "statusCode": 404
}
```

**UI Action:** Display message: "Please configure Jira integration first"

---

#### 400 Bad Request - External API Error
```json
{
  "message": "Jira API error: Invalid JQL query",
  "error": "Bad Request",
  "statusCode": 400
}
```

**UI Action:** Display error with suggestion to verify JQL syntax

---

### Error Handling Best Practices

```typescript
try {
  const response = await fetch('/integrations/jira/import-requirements', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(importData),
  });

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 400:
        // Validation error - show inline on form
        showValidationErrors(error.message);
        break;
      case 401:
        // Unauthorized - redirect to login
        redirectToLogin();
        break;
      case 403:
        // Forbidden - show permission error
        showError('You do not have permission to perform this action');
        break;
      case 404:
        // Not found - integration not configured
        showError('Please configure the integration first');
        break;
      default:
        showError('An unexpected error occurred. Please try again.');
    }
    return;
  }

  const result = await response.json();
  handleImportSuccess(result);
} catch (error) {
  // Network error
  showError('Unable to connect to the server. Please check your connection.');
}
```

---

## TypeScript Types

### Integration Types

```typescript
// Integration Configuration Types
export enum IntegrationType {
  JIRA = 'jira',
  GITHUB = 'github',
  CLICKUP = 'clickup',
  AZURE_DEVOPS = 'azureDevops',
}

export interface JiraIntegration {
  domain: string;
  email: string;
  apiToken: string; // Will be masked as "••••••••" in responses
  enabled: boolean;
  configuredBy?: string;
  configuredAt?: string;
  lastUsedAt?: string;
}

export interface GitHubIntegration {
  token: string; // Will be masked
  enabled: boolean;
  configuredBy?: string;
  configuredAt?: string;
  lastUsedAt?: string;
}

export interface ClickUpIntegration {
  token: string; // Will be masked
  enabled: boolean;
  configuredBy?: string;
  configuredAt?: string;
  lastUsedAt?: string;
}

export interface AzureDevOpsIntegration {
  organization: string;
  pat: string; // Will be masked
  enabled: boolean;
  configuredBy?: string;
  configuredAt?: string;
  lastUsedAt?: string;
}

export interface OrganizationIntegrations {
  jira?: JiraIntegration;
  github?: GitHubIntegration;
  clickup?: ClickUpIntegration;
  azureDevops?: AzureDevOpsIntegration;
}

export interface Organization {
  _id: string;
  name: string;
  description?: string;
  integrations?: OrganizationIntegrations;
  // ... other fields
}
```

---

### Import Request Types

```typescript
// Jira Import
export interface ImportJiraRequirementsDto {
  organizationId: string;
  projectId: string;
  estimateId: string;
  jql: string;
}

// GitHub Import
export interface ImportGitHubRequirementsDto {
  organizationId: string;
  projectId: string;
  estimateId: string;
  owner: string;
  repo: string;
  state: 'open' | 'closed' | 'all';
}

// ClickUp Import
export interface ImportClickUpRequirementsDto {
  organizationId: string;
  projectId: string;
  estimateId: string;
  listId: string;
}

// Azure DevOps Import
export interface ImportAzureDevOpsRequirementsDto {
  organizationId: string;
  projectId: string;
  estimateId: string;
  project: string;
  wiql: string;
}
```

---

### Import Response Types

```typescript
export interface ImportResultResponse {
  success: boolean;
  data: {
    imported: number;
    skipped: number;
    failed: number;
    requirements: Requirement[];
  };
}

export interface Requirement {
  _id: string;
  title: string;
  description: string;
  source: 'manual' | 'jira' | 'github' | 'clickup' | 'azureDevops';
  sourceReference?: string; // e.g., "PROJ-123", "#45", "86act5qnm"
  sourceMetadata?: {
    issueType?: string;
    status?: string;
    priority?: string;
    created?: string;
    updated?: string;
    externalUrl?: string;
    [key: string]: any;
  };
  estimateId: string;
  organizationId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Resource Listing Types

```typescript
// Jira
export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraProjectsResponse {
  projects: JiraProject[];
}

// GitHub
export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
}

export interface GitHubRepositoriesResponse {
  repositories: GitHubRepository[];
}

// ClickUp
export interface ClickUpList {
  id: string;
  name: string;
  spaceName: string;
  folderName: string | null;
}

export interface ClickUpListsResponse {
  lists: ClickUpList[];
}

// Azure DevOps
export interface AzureDevOpsProject {
  id: string;
  name: string;
  description: string;
  state: string;
}

export interface AzureDevOpsProjectsResponse {
  projects: AzureDevOpsProject[];
}
```

---

### Test Connection Types

```typescript
export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: {
    serverInfo?: {
      version: string;
      deploymentType: string;
    };
    userInfo?: {
      displayName: string;
      emailAddress: string;
    };
    user?: {
      login: string;
      name: string;
      email: string | null;
    };
    organization?: string;
    projectCount?: number;
  };
}
```

---

## Step-by-Step Implementation

### 1. Create Integration Service

```typescript
// src/services/integrations.service.ts

import { API_BASE_URL } from '@/config';

class IntegrationsService {
  private getHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Configure Jira
  async configureJira(
    organizationId: string,
    data: Omit<JiraIntegration, 'configuredBy' | 'configuredAt' | 'lastUsedAt'>,
    token: string
  ): Promise<Organization> {
    const response = await fetch(
      `${API_BASE_URL}/organizations/${organizationId}/integrations/jira`,
      {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to configure Jira integration');
    }

    return response.json();
  }

  // Test Jira Connection
  async testJiraConnection(
    organizationId: string,
    token: string
  ): Promise<TestConnectionResponse> {
    const response = await fetch(
      `${API_BASE_URL}/organizations/${organizationId}/integrations/jira/test`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Connection test failed');
    }

    return response.json();
  }

  // List Jira Projects
  async listJiraProjects(
    organizationId: string,
    token: string
  ): Promise<JiraProjectsResponse> {
    const response = await fetch(
      `${API_BASE_URL}/organizations/${organizationId}/integrations/jira/projects`,
      {
        method: 'GET',
        headers: this.getHeaders(token),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list projects');
    }

    return response.json();
  }

  // Import from Jira
  async importFromJira(
    data: ImportJiraRequirementsDto,
    token: string
  ): Promise<ImportResultResponse> {
    const response = await fetch(
      `${API_BASE_URL}/integrations/jira/import-requirements`,
      {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import requirements');
    }

    return response.json();
  }

  // Similar methods for GitHub, ClickUp, Azure DevOps...
}

export const integrationsService = new IntegrationsService();
```

---

### 2. Create Configuration Component (React Example)

```tsx
// src/components/integrations/ConfigureJiraModal.tsx

import React, { useState } from 'react';
import { integrationsService } from '@/services/integrations.service';

interface Props {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfigureJiraModal: React.FC<Props> = ({
  organizationId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    domain: '',
    email: '',
    apiToken: '',
    enabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);

  const token = localStorage.getItem('authToken')!;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      // Save first
      await integrationsService.configureJira(organizationId, formData, token);

      // Then test
      const result = await integrationsService.testJiraConnection(organizationId, token);
      setTestResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await integrationsService.configureJira(organizationId, formData, token);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-header">
        <h2>Configure Jira Integration</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="modal-body">
        <div className="form-group">
          <label>Jira Domain *</label>
          <input
            type="text"
            placeholder="company.atlassian.net"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
          />
          <small>Example: mycompany.atlassian.net (without https)</small>
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            placeholder="admin@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>API Token *</label>
          <input
            type="password"
            placeholder="Enter your Jira API token"
            value={formData.apiToken}
            onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
          />
          <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank">
            How to generate API token?
          </a>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
            Enable integration
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.message}
            {testResult.details?.userInfo && (
              <div>Connected as: {testResult.details.userInfo.displayName}</div>
            )}
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button onClick={handleTestConnection} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};
```

---

### 3. Create Import Component (React Example)

```tsx
// src/components/integrations/ImportFromJiraModal.tsx

import React, { useState, useEffect } from 'react';
import { integrationsService } from '@/services/integrations.service';

interface Props {
  organizationId: string;
  projectId: string;
  estimateId: string;
  onClose: () => void;
  onSuccess: (result: ImportResultResponse) => void;
}

export const ImportFromJiraModal: React.FC<Props> = ({
  organizationId,
  projectId,
  estimateId,
  onClose,
  onSuccess,
}) => {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [jql, setJql] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem('authToken')!;

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await integrationsService.listJiraProjects(organizationId, token);
      setProjects(response.projects);

      if (response.projects.length > 0) {
        setSelectedProject(response.projects[0].key);
        setJql(`project = ${response.projects[0].key}`);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleProjectChange = (projectKey: string) => {
    setSelectedProject(projectKey);
    setJql(`project = ${projectKey}`);
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await integrationsService.importFromJira(
        {
          organizationId,
          projectId,
          estimateId,
          jql,
        },
        token
      );

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-header">
        <h2>Import Requirements from Jira</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="modal-body">
        <div className="form-group">
          <label>Select Project</label>
          <select value={selectedProject} onChange={(e) => handleProjectChange(e.target.value)}>
            {projects.map((project) => (
              <option key={project.key} value={project.key}>
                {project.key} - {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>JQL Query</label>
          <textarea
            rows={3}
            value={jql}
            onChange={(e) => setJql(e.target.value)}
            placeholder="project = PROJ AND status = 'To Do'"
          />
          <small>
            Common filters:
            <ul>
              <li onClick={() => setJql(`project = ${selectedProject}`)}>
                All issues in project
              </li>
              <li onClick={() => setJql(`project = ${selectedProject} AND type = Story`)}>
                Stories only
              </li>
              <li onClick={() => setJql(`project = ${selectedProject} AND status = 'To Do'`)}>
                Open issues
              </li>
            </ul>
          </small>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="modal-footer">
        <button onClick={handleImport} disabled={isLoading || !jql}>
          {isLoading ? 'Importing...' : 'Import'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};
```

---

### 4. Display Import Results

```tsx
// src/components/integrations/ImportResultModal.tsx

import React from 'react';

interface Props {
  result: ImportResultResponse;
  onClose: () => void;
}

export const ImportResultModal: React.FC<Props> = ({ result, onClose }) => {
  const { imported, skipped, failed, requirements } = result.data;

  return (
    <div className="modal">
      <div className="modal-header">
        <h2>Import Complete!</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="modal-body">
        <div className="import-summary">
          {imported > 0 && (
            <div className="success">
              ✓ Successfully imported {imported} requirement{imported !== 1 ? 's' : ''}
            </div>
          )}

          {skipped > 0 && (
            <div className="info">
              ℹ {skipped} requirement{skipped !== 1 ? 's were' : ' was'} skipped (already imported)
            </div>
          )}

          {failed > 0 && (
            <div className="error">
              ✗ {failed} requirement{failed !== 1 ? 's' : ''} failed to import
            </div>
          )}
        </div>

        {imported > 0 && (
          <div className="imported-requirements">
            <h3>New Requirements:</h3>
            <ul>
              {requirements.slice(0, 5).map((req) => (
                <li key={req._id}>
                  {req.sourceReference && `${req.sourceReference} - `}
                  {req.title}
                  {req.sourceMetadata?.externalUrl && (
                    <a href={req.sourceMetadata.externalUrl} target="_blank" rel="noopener">
                      ↗
                    </a>
                  )}
                </li>
              ))}
              {requirements.length > 5 && (
                <li>... and {requirements.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button onClick={onClose}>Done</button>
      </div>
    </div>
  );
};
```

---

## Security Best Practices

### 1. Token Storage
- Store JWT tokens in `httpOnly` cookies (preferred) or `localStorage`
- Never expose API tokens in client-side code
- Clear tokens on logout

### 2. HTTPS Only
- Always use HTTPS in production
- API tokens are transmitted securely

### 3. Error Messages
- Don't expose sensitive information in error messages
- Log detailed errors server-side only

### 4. Rate Limiting
- Implement client-side debouncing for API calls
- Respect external API rate limits

---

## Testing Checklist

### Integration Configuration
- [ ] Admin can configure Jira integration
- [ ] Admin can configure GitHub integration
- [ ] Admin can configure ClickUp integration
- [ ] Admin can configure Azure DevOps integration
- [ ] Non-admin users cannot access configuration
- [ ] Test connection validates credentials
- [ ] Credentials are masked in UI
- [ ] Integration can be enabled/disabled
- [ ] Integration can be deleted
- [ ] Integration can be updated

### Resource Listing
- [ ] Jira projects load correctly
- [ ] GitHub repositories load correctly
- [ ] ClickUp lists load correctly
- [ ] Azure DevOps projects load correctly
- [ ] Error handling for unauthorized access
- [ ] Empty state when no resources found

### Import Functionality
- [ ] Jira import with JQL works
- [ ] GitHub import with filters works
- [ ] ClickUp import works
- [ ] Azure DevOps import with WIQL works
- [ ] Duplicate detection prevents re-importing
- [ ] Import progress is shown
- [ ] Import results are displayed correctly
- [ ] Errors are handled gracefully
- [ ] Imported requirements appear in list
- [ ] External URLs are clickable

---

## FAQ

### Q: Can multiple users import at the same time?
**A:** Yes, the system supports concurrent imports. Each import is independent.

### Q: What happens if I import the same requirements twice?
**A:** The system detects duplicates based on `sourceReference` and skips them.

### Q: Can I edit imported requirements?
**A:** Yes, imported requirements can be edited like manual requirements. The `source` field remains unchanged.

### Q: How do I rotate API tokens?
**A:** Update the integration configuration with the new token. Old imports remain intact.

### Q: What if an external API is down?
**A:** The import will fail with an error message. Users can retry later.

### Q: Can I filter which requirements to import?
**A:** Yes, use JQL for Jira, state filter for GitHub, and WIQL for Azure DevOps.

---

## Support & Documentation Links

### Getting API Credentials

**Jira:**
- [Generate API Token](https://id.atlassian.com/manage-profile/security/api-tokens)
- [JQL Documentation](https://www.atlassian.com/software/jira/guides/jql/overview)

**GitHub:**
- [Create Personal Access Token](https://github.com/settings/tokens)
- Required scopes: `repo` (for private repos) or `public_repo`

**ClickUp:**
- [Generate API Token](https://app.clickup.com/settings/apps)
- Navigate to Settings → Apps → API Token

**Azure DevOps:**
- [Create PAT](https://dev.azure.com/[organization]/_usersSettings/tokens)
- Required scopes: `Work Items (Read)`
- [WIQL Documentation](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)

---

## Changelog

### Version 1.0.0 (2025-10-24)
- Initial implementation
- Support for Jira, GitHub, ClickUp, Azure DevOps
- Organization-level configuration
- AES-256-GCM encryption
- Duplicate detection
- Resource listing

---

**Ready for frontend integration!** 🚀

For questions or issues, please contact the backend team or refer to the API documentation at `/api` (Swagger UI).
