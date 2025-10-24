#!/bin/bash

source .env

# Use existing test data
ORG_ID="68fba70997294757ed77a064"
PROJECT_ID="68fba70997294757ed77a069"
ESTIMATE_ID="68fba70997294757ed77a06d"

# Create new admin user
TIMESTAMP=$(date +%s)
TOKEN=$(curl -s -X POST "http://localhost:8081/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test-${TIMESTAMP}@test.com\",\"password\":\"Test123!\",\"username\":\"test${TIMESTAMP}\",\"role\":\"admin\"}" | jq -r '.accessToken')

# Configure Azure DevOps integration
curl -s -X POST "http://localhost:8081/organizations/${ORG_ID}/integrations/azure-devops" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"organization\": \"${AZURE_ORG}\", \"pat\": \"${AZURE_PAT}\", \"enabled\": true}" > /dev/null

echo "Testing Azure DevOps import from pipeline-java-spring-mysql (37 work items)..."
curl -s -X POST "http://localhost:8081/integrations/azure-devops/import-requirements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"estimateId\": \"${ESTIMATE_ID}\",
    \"project\": \"pipeline-java-spring-mysql\",
    \"wiql\": \"SELECT [System.Id], [System.Title], [System.State] FROM workitems\"
  }" | jq '.data | {imported: .imported, skipped: .skipped, failed: .failed, total_requirements: (.requirements | length)}'
