#!/bin/bash

# Load environment variables
source .env
set -a
source .env
set +a

echo "Creating Jira test issue..."
echo "Domain: ${JIRA_DOMAIN}"
echo "Email: ${JIRA_EMAIL}"
echo ""

# Create issue with ADF format description
RESPONSE=$(curl -s -X POST "https://${JIRA_DOMAIN}/rest/api/3/issue" \
  -H "Authorization: Basic $(echo -n ${JIRA_EMAIL}:${JIRA_API_TOKEN} | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": {
        "key": "MEAS"
      },
      "summary": "Test requirement from Measura API",
      "description": {
        "type": "doc",
        "version": 1,
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "This is a test requirement created via Jira API to verify integration with Measura backend."
              }
            ]
          }
        ]
      },
      "issuetype": {
        "name": "Task"
      }
    }
  }')

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool

# Extract issue key
ISSUE_KEY=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('key', 'Not found'))")

if [ "$ISSUE_KEY" != "Not found" ]; then
  echo ""
  echo "✅ Issue created: $ISSUE_KEY"
  echo "URL: https://${JIRA_DOMAIN}/browse/${ISSUE_KEY}"
  echo ""
  echo "Now testing import via Measura API..."
  echo ""
  
  # Test import
  curl -X POST "http://localhost:8080/integrations/jira/import-requirements" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"organizationId\": \"${ORG_ID}\",
      \"projectId\": \"${PROJECT_ID}\",
      \"estimateId\": \"${ESTIMATE_ID}\",
      \"jql\": \"project = MEAS AND key = ${ISSUE_KEY}\"
    }" | python3 -m json.tool
else
  echo ""
  echo "❌ Failed to create issue"
fi
