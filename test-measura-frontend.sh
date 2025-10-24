#!/bin/bash

source .env

# Use existing test data from last run
ORG_ID="68fba70997294757ed77a064"
PROJECT_ID="68fba70997294757ed77a069"
ESTIMATE_ID="68fba70997294757ed77a06d"

# Create new admin user
TIMESTAMP=$(date +%s)
TOKEN=$(curl -s -X POST "http://localhost:8081/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test-${TIMESTAMP}@test.com\",\"password\":\"Test123!\",\"username\":\"test${TIMESTAMP}\",\"role\":\"admin\"}" | jq -r '.accessToken')

# Configure GitHub integration
curl -s -X POST "http://localhost:8081/organizations/${ORG_ID}/integrations/github" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"token\": \"${GITHUB_TOKEN}\", \"enabled\": true}" > /dev/null

echo "Testing Measura-TCC/measura-frontend (15 issues)..."
curl -s -X POST "http://localhost:8081/integrations/github/import-requirements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"estimateId\": \"${ESTIMATE_ID}\",
    \"owner\": \"Measura-TCC\",
    \"repo\": \"measura-frontend\",
    \"state\": \"all\"
  }" | jq '.data | {imported: .imported, skipped: .skipped, failed: .failed, total_requirements: (.requirements | length)}'
