#!/bin/bash

set -a
source .env
set +a

BASE_URL="http://localhost:${PORT:-8080}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Usage: $0 <TOKEN> <ORG_ID> <INTEGRATION_TYPE>"
    echo "  INTEGRATION_TYPE: jira|github|clickup|azure"
    exit 1
fi

TOKEN=$1
ORG_ID=$2
INTEGRATION_TYPE=$3

case $INTEGRATION_TYPE in
    jira)
        log_info "Listing Jira projects..."
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/jira/projects" \
            -H "Authorization: Bearer ${TOKEN}")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" -eq 200 ]; then
            log_success "Jira projects retrieved successfully"
            echo "$BODY" | jq '.projects[] | "\(.key) - \(.name)"' -r
        else
            log_error "Failed to retrieve Jira projects (HTTP $HTTP_CODE)"
            echo "$BODY"
        fi
        ;;

    github)
        log_info "Listing GitHub repositories..."
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/github/repositories" \
            -H "Authorization: Bearer ${TOKEN}")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" -eq 200 ]; then
            log_success "GitHub repositories retrieved successfully"
            echo "$BODY" | jq '.repositories[] | "\(.fullName) (\(if .private then "private" else "public" end))"' -r
        else
            log_error "Failed to retrieve GitHub repositories (HTTP $HTTP_CODE)"
            echo "$BODY"
        fi
        ;;

    clickup)
        log_info "Listing ClickUp lists..."
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/clickup/lists" \
            -H "Authorization: Bearer ${TOKEN}")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" -eq 200 ]; then
            log_success "ClickUp lists retrieved successfully"
            echo "$BODY" | jq '.lists[] | "\(.id) - \(.name) (Space: \(.spaceName // "N/A"), Folder: \(.folderName // "None"))"' -r
        else
            log_error "Failed to retrieve ClickUp lists (HTTP $HTTP_CODE)"
            echo "$BODY"
        fi
        ;;

    azure)
        log_info "Listing Azure DevOps projects..."
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/azure-devops/projects" \
            -H "Authorization: Bearer ${TOKEN}")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" -eq 200 ]; then
            log_success "Azure DevOps projects retrieved successfully"
            echo "$BODY" | jq '.projects[] | "\(.name) - \(.description // "No description")"' -r
        else
            log_error "Failed to retrieve Azure DevOps projects (HTTP $HTTP_CODE)"
            echo "$BODY"
        fi
        ;;

    *)
        log_error "Invalid integration type. Use: jira|github|clickup|azure"
        exit 1
        ;;
esac
