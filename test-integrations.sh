#!/bin/bash

set -e

BASE_URL="http://localhost:8080"
ORG_ID=""
USER_TOKEN=""
ESTIMATE_ID=""
PROJECT_ID=""

echo "============================================"
echo "    Measura Integrations Test Suite"
echo "============================================"
echo ""

if [ -z "$USER_TOKEN" ]; then
  echo "⚠️  Warning: USER_TOKEN not set"
  echo "Please set USER_TOKEN environment variable with a valid admin JWT token"
  echo "Example: export USER_TOKEN=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\""
  echo ""
  exit 1
fi

if [ -z "$ORG_ID" ]; then
  echo "⚠️  Warning: ORG_ID not set"
  echo "Please set ORG_ID environment variable"
  echo "Example: export ORG_ID=\"68c8750f70b5c520bf74c6d7\""
  echo ""
  exit 1
fi

if [ -z "$PROJECT_ID" ]; then
  echo "⚠️  Warning: PROJECT_ID not set"
  echo "Please set PROJECT_ID environment variable"
  echo "Example: export PROJECT_ID=\"68c8757170b5c520bf74c6fd\""
  echo ""
  exit 1
fi

if [ -z "$ESTIMATE_ID" ]; then
  echo "⚠️  Warning: ESTIMATE_ID not set"
  echo "Please set ESTIMATE_ID environment variable"
  echo "Example: export ESTIMATE_ID=\"68f45221568697b82b8ea111\""
  echo ""
  exit 1
fi

echo "✓ Environment variables configured"
echo ""

echo "================================================"
echo " 1. Configure Jira Integration (Admin Only)"
echo "================================================"
echo ""

curl -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/jira" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "test-company.atlassian.net",
    "email": "test@test.com",
    "apiToken": "ATATT3xFfGF0TestToken123",
    "enabled": true
  }' | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 2. Test Jira Connection (Admin Only)"
echo "================================================"
echo ""

curl -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/jira/test" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 3. Configure GitHub Integration (Admin Only)"
echo "================================================"
echo ""

curl -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/github" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ghp_TestToken123456789",
    "enabled": true
  }' | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 4. Test GitHub Connection (Admin Only)"
echo "================================================"
echo ""

curl -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/github/test" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 5. Configure ClickUp Integration (Admin Only)"
echo "================================================"
echo ""

curl -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/clickup" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "pk_TestToken123456789",
    "enabled": true
  }' | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 6. Configure Azure DevOps Integration (Admin Only)"
echo "================================================"
echo ""

curl -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/azure-devops" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "organization": "test-org",
    "pat": "TestPAT123456789",
    "enabled": true
  }' | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 7. Update Jira Integration - Disable (Admin Only)"
echo "================================================"
echo ""

curl -X PUT "${BASE_URL}/organizations/${ORG_ID}/integrations/jira" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }' | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 8. Update Jira Integration - Re-enable (Admin Only)"
echo "================================================"
echo ""

curl -X PUT "${BASE_URL}/organizations/${ORG_ID}/integrations/jira" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true
  }' | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 9. Import Requirements from Jira"
echo "================================================"
echo ""
echo "⚠️  Note: This will fail with test credentials"
echo "To test with real data, update the JQL query below"
echo ""

curl -X POST "${BASE_URL}/integrations/jira/import-requirements" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"estimateId\": \"${ESTIMATE_ID}\",
    \"jql\": \"project = TEST AND status = Open\"
  }" | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 10. Import Requirements from GitHub"
echo "================================================"
echo ""
echo "⚠️  Note: This will fail with test credentials"
echo ""

curl -X POST "${BASE_URL}/integrations/github/import-requirements" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"estimateId\": \"${ESTIMATE_ID}\",
    \"owner\": \"test-org\",
    \"repo\": \"test-repo\",
    \"state\": \"all\"
  }" | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 11. Import Requirements from ClickUp"
echo "================================================"
echo ""
echo "⚠️  Note: This will fail with test credentials"
echo ""

curl -X POST "${BASE_URL}/integrations/clickup/import-requirements" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"estimateId\": \"${ESTIMATE_ID}\",
    \"listId\": \"123456789\",
    \"includeClosed\": true
  }" | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 12. Import Requirements from Azure DevOps"
echo "================================================"
echo ""
echo "⚠️  Note: This will fail with test credentials"
echo ""

curl -X POST "${BASE_URL}/integrations/azure-devops/import-requirements" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"projectId\": \"${PROJECT_ID}\",
    \"estimateId\": \"${ESTIMATE_ID}\",
    \"project\": \"TestProject\",
    \"wiql\": \"SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active'\"
  }" | jq .

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 13. Get Organization (Check integrations field)"
echo "================================================"
echo ""

curl -X GET "${BASE_URL}/organizations/${ORG_ID}" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq .integrations

echo ""
echo "Press Enter to continue..."
read

echo "================================================"
echo " 14. Delete Integrations (Cleanup)"
echo "================================================"
echo ""

echo "Deleting Jira integration..."
curl -X DELETE "${BASE_URL}/organizations/${ORG_ID}/integrations/jira" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq .

echo ""

echo "Deleting GitHub integration..."
curl -X DELETE "${BASE_URL}/organizations/${ORG_ID}/integrations/github" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq .

echo ""

echo "Deleting ClickUp integration..."
curl -X DELETE "${BASE_URL}/organizations/${ORG_ID}/integrations/clickup" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq .

echo ""

echo "Deleting Azure DevOps integration..."
curl -X DELETE "${BASE_URL}/organizations/${ORG_ID}/integrations/azure-devops" \
  -H "Authorization: Bearer ${USER_TOKEN}" | jq .

echo ""
echo "================================================"
echo "        ✓ Test Suite Complete!"
echo "================================================"
echo ""
echo "Summary:"
echo "  - Configured 4 integrations (Jira, GitHub, ClickUp, Azure DevOps)"
echo "  - Tested connections"
echo "  - Tested enable/disable functionality"
echo "  - Attempted imports (expect failures with test credentials)"
echo "  - Cleaned up integrations"
echo ""
echo "To run with real credentials:"
echo "  1. Update integration configuration with real API keys"
echo "  2. Update import parameters with real project data"
echo "  3. Re-run specific test sections"
echo ""
