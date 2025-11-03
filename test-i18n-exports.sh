#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Testing i18n Exports Implementation${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Base URL
BASE_URL="http://localhost:3000"

# Get authentication token (you'll need to provide valid credentials)
# For now, we'll assume TOKEN is set in environment or use a placeholder
if [ -z "$TOKEN" ]; then
  echo -e "${RED}ERROR: TOKEN environment variable not set${NC}"
  echo "Please set TOKEN with a valid JWT token:"
  echo "export TOKEN='your-jwt-token-here'"
  exit 1
fi

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
  local test_name="$1"
  local endpoint="$2"
  local locale="$3"
  local expected_text="$4"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
  echo "Endpoint: $endpoint?locale=$locale"

  # Make request
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL$endpoint?locale=$locale&format=html")

  # Extract status code (last line)
  http_code=$(echo "$response" | tail -n1)
  # Extract body (everything except last line)
  body=$(echo "$response" | head -n -1)

  # Check if request was successful
  if [ "$http_code" != "200" ]; then
    echo -e "${RED}✗ FAILED: HTTP $http_code${NC}"
    echo "Response: $body"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo ""
    return 1
  fi

  # Check if expected text is in response
  if echo "$body" | grep -q "$expected_text"; then
    echo -e "${GREEN}✓ PASSED: Found expected text '$expected_text'${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ FAILED: Expected text '$expected_text' not found${NC}"
    echo "Response preview: ${body:0:500}..."
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  echo ""
}

echo -e "${BLUE}=== Testing FPA Report Exports ===${NC}"
echo ""

# You'll need to provide a valid estimate ID
if [ -z "$ESTIMATE_ID" ]; then
  echo -e "${RED}WARNING: ESTIMATE_ID not set, using placeholder${NC}"
  ESTIMATE_ID="valid-estimate-id-here"
fi

# Test FPA Summary Report - English
test_endpoint \
  "FPA Summary Report (English)" \
  "/estimates/reports/$ESTIMATE_ID/summary" \
  "en" \
  "Metric"

# Test FPA Summary Report - Portuguese
test_endpoint \
  "FPA Summary Report (Portuguese)" \
  "/estimates/reports/$ESTIMATE_ID/summary" \
  "pt" \
  "Métrica"

# Test FPA Detailed Report - English
test_endpoint \
  "FPA Detailed Report (English)" \
  "/estimates/reports/$ESTIMATE_ID/detailed" \
  "en" \
  "Function Points"

# Test FPA Detailed Report - Portuguese
test_endpoint \
  "FPA Detailed Report (Portuguese)" \
  "/estimates/reports/$ESTIMATE_ID/detailed" \
  "pt" \
  "Pontos de Função"

echo -e "${BLUE}=== Testing Measurement Plans Exports ===${NC}"
echo ""

# You'll need to provide valid IDs
if [ -z "$ORG_ID" ]; then
  echo -e "${RED}WARNING: ORG_ID not set, using placeholder${NC}"
  ORG_ID="valid-org-id-here"
fi

if [ -z "$PLAN_ID" ]; then
  echo -e "${RED}WARNING: PLAN_ID not set, using placeholder${NC}"
  PLAN_ID="valid-plan-id-here"
fi

# Test Measurement Plan Export - English
test_endpoint_post() {
  local test_name="$1"
  local endpoint="$2"
  local locale="$3"
  local expected_text="$4"
  local payload="$5"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
  echo "Endpoint: $endpoint (POST with locale=$locale)"

  # Make POST request
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$BASE_URL$endpoint")

  # Extract status code (last line)
  http_code=$(echo "$response" | tail -n1)
  # Extract body (everything except last line)
  body=$(echo "$response" | head -n -1)

  # Check if request was successful (200 or 201)
  if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
    echo -e "${RED}✗ FAILED: HTTP $http_code${NC}"
    echo "Response: $body"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo ""
    return 1
  fi

  # For measurement plans export, check the downloadUrl
  if echo "$body" | grep -q "downloadUrl"; then
    echo -e "${GREEN}✓ PASSED: Export generated successfully${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))

    # Extract and test the download URL if available
    download_url=$(echo "$body" | grep -o '"downloadUrl":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$download_url" ]; then
      echo "Download URL: $BASE_URL$download_url"
    fi
  else
    echo -e "${RED}✗ FAILED: Export did not return downloadUrl${NC}"
    echo "Response: $body"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  echo ""
}

# Test Measurement Plan Export - English
test_endpoint_post \
  "Measurement Plan Export (English)" \
  "/measurement-plans/$ORG_ID/$PLAN_ID/export" \
  "en" \
  "downloadUrl" \
  '{"format":"pdf","locale":"en","options":{"includeDetails":true,"includeMeasurements":true,"includeAnalysis":true}}'

# Test Measurement Plan Export - Portuguese
test_endpoint_post \
  "Measurement Plan Export (Portuguese)" \
  "/measurement-plans/$ORG_ID/$PLAN_ID/export" \
  "pt" \
  "downloadUrl" \
  '{"format":"pdf","locale":"pt","options":{"includeDetails":true,"includeMeasurements":true,"includeAnalysis":true}}'

# Summary
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  echo "Note: If tests failed due to missing IDs, please set:"
  echo "  export ESTIMATE_ID='your-estimate-id'"
  echo "  export ORG_ID='your-org-id'"
  echo "  export PLAN_ID='your-plan-id'"
  echo "  export TOKEN='your-jwt-token'"
  exit 1
fi
