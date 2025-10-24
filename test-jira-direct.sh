#!/bin/bash

source .env

echo "Testing direct Jira project access..."
curl -s "https://${JIRA_DOMAIN}/rest/api/3/project/SCRUM" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq '{key: .key, name: .name, id: .id}'

echo -e "\n\nTesting Jira search endpoint..."
curl -s "https://${JIRA_DOMAIN}/rest/api/3/project/search" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq '{total: .total, maxResults: .maxResults, projects: .values | length}'

echo -e "\n\nTesting Jira issues in SCRUM project..."
curl -s "https://${JIRA_DOMAIN}/rest/api/3/search?jql=project=SCRUM" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq '{total: .total, issues: .issues | length}'
