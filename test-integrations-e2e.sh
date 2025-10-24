#!/bin/bash

set -a
source .env
set +a

BASE_URL="http://localhost:${PORT:-8080}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="integration-test-${TIMESTAMP}@test.com"
TEST_USERNAME="integtest${TIMESTAMP}"
TEST_PASSWORD="TestPassword123!"
TEST_ORG_NAME="Integration Test Org ${TIMESTAMP}"
TEST_PROJECT_NAME="Test Project"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_server() {
    log_info "Checking if server is running..."
    if ! curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
        log_error "Server is not running at ${BASE_URL}"
        log_info "Please start the server with: yarn start:dev"
        exit 1
    fi
    log_success "Server is running"
}

check_env_vars() {
    log_info "Checking required environment variables..."

    local missing_vars=()

    if [ -z "$JIRA_DOMAIN" ]; then missing_vars+=("JIRA_DOMAIN"); fi
    if [ -z "$JIRA_EMAIL" ]; then missing_vars+=("JIRA_EMAIL"); fi
    if [ -z "$JIRA_API_TOKEN" ]; then missing_vars+=("JIRA_API_TOKEN"); fi

    if [ -z "$GITHUB_TOKEN" ]; then missing_vars+=("GITHUB_TOKEN"); fi

    if [ -z "$CLICKUP_TOKEN" ]; then missing_vars+=("CLICKUP_TOKEN"); fi

    if [ -z "$AZURE_ORG" ]; then missing_vars+=("AZURE_ORG"); fi
    if [ -z "$AZURE_PAT" ]; then missing_vars+=("AZURE_PAT"); fi

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        log_info "Please add these to your .env file"
        exit 1
    fi

    log_success "All required environment variables are set"
}

create_test_user() {
    log_info "Creating test user: ${TEST_EMAIL}"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"username\": \"${TEST_USERNAME}\",
            \"role\": \"admin\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        USER_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
        log_success "User created successfully"
        return 0
    else
        log_error "Failed to create user (HTTP $HTTP_CODE)"
        echo "$BODY"
        exit 1
    fi
}

create_test_organization() {
    log_info "Creating test organization: ${TEST_ORG_NAME}"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/organizations" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"name\": \"${TEST_ORG_NAME}\",
            \"description\": \"Test organization for integration testing\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        ORG_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
        log_success "Organization created: ${ORG_ID}"
        return 0
    else
        log_error "Failed to create organization (HTTP $HTTP_CODE)"
        echo "$BODY"
        exit 1
    fi
}

create_test_project() {
    log_info "Creating test project: ${TEST_PROJECT_NAME}"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/projects/${ORG_ID}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"name\": \"${TEST_PROJECT_NAME}\",
            \"description\": \"A comprehensive test project created for integration testing purposes\",
            \"organizationId\": \"${ORG_ID}\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        PROJECT_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
        log_success "Project created: ${PROJECT_ID}"
        return 0
    else
        log_error "Failed to create project (HTTP $HTTP_CODE)"
        echo "$BODY"
        exit 1
    fi
}

create_test_estimate() {
    log_info "Creating test estimate"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/estimates/${ORG_ID}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"projectId\": \"${PROJECT_ID}\",
            \"name\": \"Test Estimate FPA\",
            \"description\": \"Comprehensive test estimate created for integration testing purposes and validation\",
            \"countType\": \"DEVELOPMENT_PROJECT\",
            \"applicationBoundary\": \"Test application boundary for integration testing with external systems\",
            \"countingScope\": \"All features and components included in the test application scope\",
            \"teamSize\": 5,
            \"hourlyRateBRL\": 150.0
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        ESTIMATE_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
        log_success "Estimate created: ${ESTIMATE_ID}"
        return 0
    else
        log_error "Failed to create estimate (HTTP $HTTP_CODE)"
        echo "$BODY"
        exit 1
    fi
}

configure_jira() {
    log_info "Configuring Jira integration..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/jira" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"domain\": \"${JIRA_DOMAIN}\",
            \"email\": \"${JIRA_EMAIL}\",
            \"apiToken\": \"${JIRA_API_TOKEN}\",
            \"enabled\": true
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        log_success "Jira integration configured"
        return 0
    else
        log_error "Failed to configure Jira (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

configure_github() {
    log_info "Configuring GitHub integration..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/github" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"token\": \"${GITHUB_TOKEN}\",
            \"enabled\": true
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        log_success "GitHub integration configured"
        return 0
    else
        log_error "Failed to configure GitHub (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

configure_clickup() {
    log_info "Configuring ClickUp integration..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/clickup" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"token\": \"${CLICKUP_TOKEN}\",
            \"enabled\": true
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        log_success "ClickUp integration configured"
        return 0
    else
        log_error "Failed to configure ClickUp (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

configure_azure() {
    log_info "Configuring Azure DevOps integration..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/organizations/${ORG_ID}/integrations/azure-devops" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"organization\": \"${AZURE_ORG}\",
            \"pat\": \"${AZURE_PAT}\",
            \"enabled\": true
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 201 ]; then
        log_success "Azure DevOps integration configured"
        return 0
    else
        log_error "Failed to configure Azure DevOps (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

test_jira_connection() {
    log_info "Testing Jira connection..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/jira/test" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "Jira connection test passed"
        echo "$BODY"
        return 0
    else
        log_error "Jira connection test failed (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

test_github_connection() {
    log_info "Testing GitHub connection..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/github/test" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "GitHub connection test passed"
        echo "$BODY"
        return 0
    else
        log_error "GitHub connection test failed (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

test_clickup_connection() {
    log_info "Testing ClickUp connection..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/clickup/test" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "ClickUp connection test passed"
        echo "$BODY"
        return 0
    else
        log_error "ClickUp connection test failed (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

test_azure_connection() {
    log_info "Testing Azure DevOps connection..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/azure-devops/test" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "Azure DevOps connection test passed"
        echo "$BODY"
        return 0
    else
        log_error "Azure DevOps connection test failed (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

import_jira_requirements() {
    log_info "Fetching available Jira projects..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/jira/projects" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ne 200 ]; then
        log_error "Failed to fetch Jira projects (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi

    JIRA_PROJECT_KEY=$(echo "$BODY" | jq -r '.projects[0].key' 2>/dev/null)

    if [ -z "$JIRA_PROJECT_KEY" ] || [ "$JIRA_PROJECT_KEY" = "null" ]; then
        log_error "No Jira projects found"
        return 1
    fi

    log_info "Using Jira project: ${JIRA_PROJECT_KEY}"
    log_info "Importing requirements from Jira..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/integrations/jira/import-requirements" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"organizationId\": \"${ORG_ID}\",
            \"projectId\": \"${PROJECT_ID}\",
            \"estimateId\": \"${ESTIMATE_ID}\",
            \"jql\": \"project = ${JIRA_PROJECT_KEY}\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        log_success "Jira requirements imported"
        echo "$BODY"
        return 0
    else
        log_error "Failed to import Jira requirements (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

import_github_requirements() {
    log_info "Fetching available GitHub repositories..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/github/repositories" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ne 200 ]; then
        log_error "Failed to fetch GitHub repositories (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi

    GITHUB_FULL_NAME=$(echo "$BODY" | jq -r '.repositories[0].fullName' 2>/dev/null)

    if [ -z "$GITHUB_FULL_NAME" ] || [ "$GITHUB_FULL_NAME" = "null" ]; then
        log_error "No GitHub repositories found"
        return 1
    fi

    GITHUB_OWNER=$(echo "$GITHUB_FULL_NAME" | cut -d'/' -f1)
    GITHUB_REPO=$(echo "$GITHUB_FULL_NAME" | cut -d'/' -f2)

    log_info "Using GitHub repository: ${GITHUB_FULL_NAME}"
    log_info "Importing requirements from GitHub..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/integrations/github/import-requirements" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"organizationId\": \"${ORG_ID}\",
            \"projectId\": \"${PROJECT_ID}\",
            \"estimateId\": \"${ESTIMATE_ID}\",
            \"owner\": \"${GITHUB_OWNER}\",
            \"repo\": \"${GITHUB_REPO}\",
            \"state\": \"all\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        log_success "GitHub requirements imported"
        echo "$BODY"
        return 0
    else
        log_error "Failed to import GitHub requirements (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

import_clickup_requirements() {
    log_info "Fetching available ClickUp lists..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/clickup/lists" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ne 200 ]; then
        log_error "Failed to fetch ClickUp lists (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi

    CLICKUP_LIST_ID=$(echo "$BODY" | jq -r '.lists[0].id' 2>/dev/null)

    if [ -z "$CLICKUP_LIST_ID" ] || [ "$CLICKUP_LIST_ID" = "null" ]; then
        log_error "No ClickUp lists found"
        return 1
    fi

    log_info "Using ClickUp list: ${CLICKUP_LIST_ID}"
    log_info "Importing requirements from ClickUp..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/integrations/clickup/import-requirements" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"organizationId\": \"${ORG_ID}\",
            \"projectId\": \"${PROJECT_ID}\",
            \"estimateId\": \"${ESTIMATE_ID}\",
            \"listId\": \"${CLICKUP_LIST_ID}\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        log_success "ClickUp requirements imported"
        echo "$BODY"
        return 0
    else
        log_error "Failed to import ClickUp requirements (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

import_azure_requirements() {
    log_info "Fetching available Azure DevOps projects..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/azure-devops/projects" \
        -H "Authorization: Bearer ${TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ne 200 ]; then
        log_error "Failed to fetch Azure DevOps projects (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi

    AZURE_PROJECT=$(echo "$BODY" | jq -r '.projects[0].name' 2>/dev/null)

    if [ -z "$AZURE_PROJECT" ] || [ "$AZURE_PROJECT" = "null" ]; then
        log_error "No Azure DevOps projects found"
        return 1
    fi

    log_info "Using Azure DevOps project: ${AZURE_PROJECT}"
    log_info "Importing requirements from Azure DevOps..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/integrations/azure-devops/import-requirements" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{
            \"organizationId\": \"${ORG_ID}\",
            \"projectId\": \"${PROJECT_ID}\",
            \"estimateId\": \"${ESTIMATE_ID}\",
            \"project\": \"${AZURE_PROJECT}\",
            \"wiql\": \"SELECT [System.Id], [System.Title], [System.State] FROM workitems WHERE [System.WorkItemType] = 'User Story'\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        log_success "Azure DevOps requirements imported"
        echo "$BODY"
        return 0
    else
        log_error "Failed to import Azure DevOps requirements (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Integration Requirements End-to-End Test Script         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

check_server
check_env_vars

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Phase 1: Creating Test Data"
echo "═══════════════════════════════════════════════════════════"
echo ""

create_test_user
create_test_organization
create_test_project
create_test_estimate

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Phase 2: Configuring Integrations"
echo "═══════════════════════════════════════════════════════════"
echo ""

JIRA_CONFIGURED=0
GITHUB_CONFIGURED=0
CLICKUP_CONFIGURED=0
AZURE_CONFIGURED=0

configure_jira && JIRA_CONFIGURED=1
configure_github && GITHUB_CONFIGURED=1
configure_clickup && CLICKUP_CONFIGURED=1
configure_azure && AZURE_CONFIGURED=1

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Phase 3: Testing Connections"
echo "═══════════════════════════════════════════════════════════"
echo ""

[ $JIRA_CONFIGURED -eq 1 ] && test_jira_connection
[ $GITHUB_CONFIGURED -eq 1 ] && test_github_connection
[ $CLICKUP_CONFIGURED -eq 1 ] && test_clickup_connection
[ $AZURE_CONFIGURED -eq 1 ] && test_azure_connection

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Phase 3.5: Listing Available Resources"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $JIRA_CONFIGURED -eq 1 ]; then
    log_info "Listing Jira projects..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/jira/projects" \
        -H "Authorization: Bearer ${TOKEN}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "Available Jira projects:"
        echo "$BODY" | jq -r '.projects[] | "  - \(.key): \(.name)"' 2>/dev/null | head -5 || echo "  (Unable to parse response)"
    fi
fi

if [ $GITHUB_CONFIGURED -eq 1 ]; then
    log_info "Listing GitHub repositories..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/github/repositories" \
        -H "Authorization: Bearer ${TOKEN}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "Available GitHub repositories (first 5):"
        echo "$BODY" | jq -r '.repositories[] | "  - \(.fullName)"' 2>/dev/null | head -5 || echo "  (Unable to parse response)"
    fi
fi

if [ $CLICKUP_CONFIGURED -eq 1 ]; then
    log_info "Listing ClickUp lists..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/clickup/lists" \
        -H "Authorization: Bearer ${TOKEN}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "Available ClickUp lists (first 5):"
        echo "$BODY" | jq -r '.lists[] | "  - \(.name) (Space: \(.spaceName))"' 2>/dev/null | head -5 || echo "  (Unable to parse response)"
    fi
fi

if [ $AZURE_CONFIGURED -eq 1 ]; then
    log_info "Listing Azure DevOps projects..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/organizations/${ORG_ID}/integrations/azure-devops/projects" \
        -H "Authorization: Bearer ${TOKEN}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "Available Azure DevOps projects:"
        echo "$BODY" | jq -r '.projects[] | "  - \(.name)"' 2>/dev/null || echo "  (Unable to parse response)"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Phase 4: Importing Requirements"
echo "═══════════════════════════════════════════════════════════"
echo ""

JIRA_IMPORTED=0
GITHUB_IMPORTED=0
CLICKUP_IMPORTED=0
AZURE_IMPORTED=0

[ $JIRA_CONFIGURED -eq 1 ] && import_jira_requirements && JIRA_IMPORTED=1
[ $GITHUB_CONFIGURED -eq 1 ] && import_github_requirements && GITHUB_IMPORTED=1
[ $CLICKUP_CONFIGURED -eq 1 ] && import_clickup_requirements && CLICKUP_IMPORTED=1
[ $AZURE_CONFIGURED -eq 1 ] && import_azure_requirements && AZURE_IMPORTED=1

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Test Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Test Data Created:"
echo "  User ID:        ${USER_ID}"
echo "  Organization:   ${ORG_ID}"
echo "  Project:        ${PROJECT_ID}"
echo "  Estimate:       ${ESTIMATE_ID}"
echo ""
echo "Integration Results:"
echo "  Jira:           $([ $JIRA_IMPORTED -eq 1 ] && echo -e "${GREEN}✓ SUCCESS${NC}" || echo -e "${RED}✗ FAILED${NC}")"
echo "  GitHub:         $([ $GITHUB_IMPORTED -eq 1 ] && echo -e "${GREEN}✓ SUCCESS${NC}" || echo -e "${RED}✗ FAILED${NC}")"
echo "  ClickUp:        $([ $CLICKUP_IMPORTED -eq 1 ] && echo -e "${GREEN}✓ SUCCESS${NC}" || echo -e "${RED}✗ FAILED${NC}")"
echo "  Azure DevOps:   $([ $AZURE_IMPORTED -eq 1 ] && echo -e "${GREEN}✓ SUCCESS${NC}" || echo -e "${RED}✗ FAILED${NC}")"
echo ""

TOTAL_SUCCESS=$((JIRA_IMPORTED + GITHUB_IMPORTED + CLICKUP_IMPORTED + AZURE_IMPORTED))
TOTAL_CONFIGURED=$((JIRA_CONFIGURED + GITHUB_CONFIGURED + CLICKUP_CONFIGURED + AZURE_CONFIGURED))

if [ $TOTAL_SUCCESS -eq $TOTAL_CONFIGURED ]; then
    log_success "All configured integrations tested successfully! ($TOTAL_SUCCESS/$TOTAL_CONFIGURED)"
    exit 0
else
    log_warning "Some integrations failed ($TOTAL_SUCCESS/$TOTAL_CONFIGURED succeeded)"
    exit 1
fi
