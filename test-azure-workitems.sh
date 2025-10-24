#!/bin/bash

source .env

echo "Listing Azure DevOps projects..."
curl -s "https://dev.azure.com/${AZURE_ORG}/_apis/projects?api-version=7.1" \
  -u ":${AZURE_PAT}" \
  -H "Accept: application/json" | jq -r '.value[] | "\(.name) - \(.id)"' | head -10

echo -e "\n\nTesting work items in first project (pipeline-java-spring-mysql)..."
curl -s -X POST "https://dev.azure.com/${AZURE_ORG}/pipeline-java-spring-mysql/_apis/wit/wiql?api-version=7.1" \
  -u ":${AZURE_PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT [System.Id], [System.Title] FROM workitems"}' | jq '{total: (.workItems | length), ids: [.workItems[].id]}'
