#!/bin/bash

source .env

echo "1. Testing authentication..."
curl -s "https://${JIRA_DOMAIN}/rest/api/3/myself" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq '{accountId, emailAddress, displayName, accountType}'

echo -e "\n2. Testing accessible resources..."
curl -s "https://api.atlassian.com/oauth/token/accessible-resources" \
  -H "Authorization: Bearer ${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq '.'

echo -e "\n3. Testing project access (all projects)..."
curl -s "https://${JIRA_DOMAIN}/rest/api/3/project" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq 'if type == "array" then length else . end'

echo -e "\n4. Testing permissions on SCRUM project..."
curl -s "https://${JIRA_DOMAIN}/rest/api/3/mypermissions?projectKey=SCRUM" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq '{permissions: .permissions | keys[:5]}'

echo -e "\n5. Testing issue search..."
curl -s "https://${JIRA_DOMAIN}/rest/api/3/search?jql=order+by+created+DESC&maxResults=5" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" | jq '{total, maxResults, startAt}'
