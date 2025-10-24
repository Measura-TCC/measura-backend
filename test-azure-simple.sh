#!/bin/bash
source .env
TIMESTAMP=$(date +%s)
TOKEN=$(curl -s -X POST "http://localhost:8081/auth/register" -H "Content-Type: application/json" -d '{"email":"test-'${TIMESTAMP}'@test.com","password":"Test123!","username":"test'${TIMESTAMP}'","role":"admin"}' | jq -r '.accessToken')
curl -s -X POST "http://localhost:8081/organizations/68fba70997294757ed77a064/integrations/azure-devops" -H "Content-Type: application/json" -H "Authorization: Bearer ${TOKEN}" -d '{"organization": "'${AZURE_ORG}'", "pat": "'${AZURE_PAT}'", "enabled": true}' > /dev/null
curl -s -X POST "http://localhost:8081/integrations/azure-devops/import-requirements" -H "Content-Type: application/json" -H "Authorization: Bearer ${TOKEN}" -d '{"organizationId": "68fba70997294757ed77a064","projectId": "68fba70997294757ed77a069","estimateId": "68fba70997294757ed77a06d","project": "pipeline-java-spring-mysql","wiql": "SELECT [System.Id], [System.Title] FROM workitems"}'
