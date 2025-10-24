Backend API Modification Proposal: Add Preview Mode to Import Endpoints
Overview
Add an optional preview parameter to all import endpoints that allows fetching requirements from external sources without saving them to the database. This enables the frontend to display actual imported data for user review before committing to the estimate.
Affected Endpoints
All four integration import endpoints:
POST /integrations/jira/import-requirements
POST /integrations/github/import-requirements
POST /integrations/clickup/import-requirements
POST /integrations/azure-devops/import-requirements
Request Changes
Current Request Structure (Jira example):
POST /integrations/jira/import-requirements
{
organizationId: string; // Required
projectId: string; // Required
estimateId: string; // Required
jql: string; // Required
}
Proposed Request Structure:
POST /integrations/jira/import-requirements
{
organizationId: string; // Required
projectId: string; // Required
estimateId?: string; // Optional when preview=true
jql: string; // Required
preview?: boolean; // Optional, defaults to false
}
Behavior
When preview: true:
Fetch data from external source (Jira, GitHub, etc.) using the provided query/filters
Transform data into requirement objects (same transformation as normal import)
DO NOT save to database
Return the transformed requirements in the response
Skip the estimateId validation (since we're not saving)
When preview: false or omitted (current behavior):
Fetch data from external source
Transform data into requirement objects
Validate estimateId is provided
Save requirements to the estimate in the database
Return the saved requirements in the response
Response Structure
The response structure remains the same for both preview and actual import:
{
success: boolean;
data: {
imported: number; // Count of requirements fetched/imported
skipped: number; // Count of requirements skipped (duplicates, etc.)
failed: number; // Count of requirements that failed
requirements: Array<{ // Full requirement objects
\_id: string; // Temporary ID for preview, real ID for actual import
title: string;
description: string;
source: "jira" | "github" | "clickup" | "azure_devops";
sourceReference: string; // e.g., "MEAS-123", "owner/repo#456"
sourceMetadata: {
issueType?: string;
status?: string;
priority?: string;
externalUrl?: string;
[key: string]: any;
};
// ... other requirement fields
}>;
};
}
Note on \_id field:
Preview mode: Generate temporary IDs (e.g., using UUID or timestamp-based IDs) since requirements aren't saved
Actual import: Use real MongoDB \_id from saved documents
Implementation Guidance
Pseudo-code for backend:
async function importRequirements(dto: ImportJiraRequirementsDto) {
const { organizationId, projectId, estimateId, jql, preview = false } = dto;

// 1. Validate organization has Jira integration configured
const integration = await getJiraIntegration(organizationId);
if (!integration) {
throw new Error('Jira integration not configured');
}

// 2. Fetch requirements from Jira using JQL
const jiraIssues = await fetchJiraIssues(integration, jql);

// 3. Transform Jira issues to requirement objects
const requirements = jiraIssues.map(issue => transformJiraIssue(issue));

// 4. If preview mode, return without saving
if (preview) {
return {
success: true,
data: {
imported: requirements.length,
skipped: 0,
failed: 0,
requirements: requirements.map(req => ({
...req,
\_id: generateTempId(), // Generate temporary ID
})),
},
};
}

// 5. If not preview, validate estimateId and save to database
if (!estimateId) {
throw new Error('estimateId is required when not in preview mode');
}

const estimate = await getEstimate(estimateId);
if (!estimate) {
throw new Error('Estimate not found');
}

// 6. Save requirements to estimate
const savedRequirements = await saveRequirementsToEstimate(estimateId, requirements);

return {
success: true,
data: {
imported: savedRequirements.length,
skipped: 0,
failed: 0,
requirements: savedRequirements,
},
};
}
All Four Endpoints
Apply the same pattern to all integration endpoints:
Jira
POST /integrations/jira/import-requirements
{
organizationId: string;
projectId: string;
estimateId?: string;
jql: string;
preview?: boolean;
}
GitHub
POST /integrations/github/import-requirements
{
organizationId: string;
projectId: string;
estimateId?: string;
owner: string;
repo: string;
state: "open" | "closed" | "all";
preview?: boolean;
}
ClickUp
POST /integrations/clickup/import-requirements
{
organizationId: string;
projectId: string;
estimateId?: string;
listId: string;
preview?: boolean;
}
Azure DevOps
POST /integrations/azure-devops/import-requirements
{
organizationId: string;
projectId: string;
estimateId?: string;
project: string;
wiql: string;
preview?: boolean;
}
Frontend Usage Example
// Step 1: Preview import (user clicks "Import from Jira")
const previewResult = await integrationService.importFromJira({
organizationId: "123",
projectId: "456",
jql: "project = MEAS",
preview: true, // Don't save, just fetch
});

// Step 2: Show preview table with previewResult.data.requirements
// User reviews and selects which requirements to keep

// Step 3: Actual import (user clicks "Add Selected")
const importResult = await integrationService.importFromJira({
organizationId: "123",
projectId: "456",
estimateId: "789", // Now we have the estimate ID
jql: "project = MEAS",
preview: false, // Actually save to database
});
Benefits
Better UX: Users can see actual imported data before committing
Flexibility: Works both during estimate creation (preview) and after (actual import)
Backward compatible: Default behavior (preview: false) remains unchanged
Consistent: Same pattern across all four integration sources
Simple: Single boolean flag controls the behavior
Migration Impact
Breaking changes: None (new optional parameter)
Existing code: Continues to work as-is
New feature: Frontend can now use preview mode
