#!/bin/bash

# Load environment variables
source .env
set -a
source .env
set +a

echo "Fetching Jira issues from project MEAS..."
echo ""

# Get issues with JQL
curl -s -X GET "https://${JIRA_DOMAIN}/rest/api/3/search?jql=project=MEAS&maxResults=10" \
  -H "Authorization: Basic $(echo -n ${JIRA_EMAIL}:${JIRA_API_TOKEN} | base64)" \
  -H "Accept: application/json" | python3 -m json.tool

echo ""
echo "---"
echo ""
echo "Testing Measura import for all MEAS issues..."
echo ""

# Import all issues from MEAS project
curl -X POST "http://localhost:8080/integrations/jira/import-requirements" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"estimateId\": \"${ESTIMATE_ID}\",
    \"jql\": \"project = MEAS\"
  }" | python3 -m json.tool
