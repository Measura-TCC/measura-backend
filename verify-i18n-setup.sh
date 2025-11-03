#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Verifying i18n Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check if file exists
check_file() {
  local file="$1"
  local description="$2"

  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    echo -e "  ${BLUE}Found:${NC} $file"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} $description"
    echo -e "  ${RED}Missing:${NC} $file"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
  echo ""
}

# Function to check if text exists in file
check_text_in_file() {
  local file="$1"
  local text="$2"
  local description="$3"

  if [ ! -f "$file" ]; then
    echo -e "${RED}✗${NC} $description"
    echo -e "  ${RED}File not found:${NC} $file"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    echo ""
    return
  fi

  if grep -q "$text" "$file"; then
    echo -e "${GREEN}✓${NC} $description"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} $description"
    echo -e "  ${RED}Text not found:${NC} '$text' in $file"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
  echo ""
}

# Function to check JSON file has key
check_json_key() {
  local file="$1"
  local key="$2"
  local description="$3"

  if [ ! -f "$file" ]; then
    echo -e "${RED}✗${NC} $description"
    echo -e "  ${RED}File not found:${NC} $file"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    echo ""
    return
  fi

  if grep -q "\"$key\"" "$file"; then
    echo -e "${GREEN}✓${NC} $description"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} $description"
    echo -e "  ${RED}Key not found:${NC} '$key' in $file"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
  echo ""
}

echo -e "${YELLOW}1. Checking i18n Module Setup${NC}"
echo ""

check_file "src/i18n/i18n.module.ts" "i18n module configuration file exists"
check_text_in_file "src/i18n/i18n.module.ts" "I18nModule.forRoot" "i18n module is properly configured"
check_text_in_file "src/i18n/i18n.module.ts" "QueryResolver" "Query resolver is configured"
check_text_in_file "src/app.module.ts" "I18nConfigModule" "i18n module is imported in AppModule"

echo -e "${YELLOW}2. Checking Translation Files - Plans Export${NC}"
echo ""

check_file "src/i18n/translations/en/plans-export.json" "English translations file exists (plans)"
check_file "src/i18n/translations/pt/plans-export.json" "Portuguese translations file exists (plans)"
check_json_key "src/i18n/translations/en/plans-export.json" "planName" "English translations have 'planName' key"
check_json_key "src/i18n/translations/pt/plans-export.json" "planName" "Portuguese translations have 'planName' key"
check_json_key "src/i18n/translations/en/plans-export.json" "metric" "English translations have 'metric' key"
check_json_key "src/i18n/translations/pt/plans-export.json" "metric" "Portuguese translations have 'metric' key"

echo -e "${YELLOW}3. Checking Translation Files - FPA Export${NC}"
echo ""

check_file "src/i18n/translations/en/fpa-export.json" "English translations file exists (FPA)"
check_file "src/i18n/translations/pt/fpa-export.json" "Portuguese translations file exists (FPA)"
check_json_key "src/i18n/translations/en/fpa-export.json" "totalFunctionPointsUnadjusted" "English translations have 'totalFunctionPointsUnadjusted' key"
check_json_key "src/i18n/translations/pt/fpa-export.json" "totalFunctionPointsUnadjusted" "Portuguese translations have 'totalFunctionPointsUnadjusted' key"

echo -e "${YELLOW}4. Checking Controllers${NC}"
echo ""

check_text_in_file "src/controllers/measurement-plans/export.controller.ts" "exportDto.locale" "Plans export controller accepts locale parameter"
check_text_in_file "src/controllers/fpa/reports.controller.ts" "locale: string" "FPA reports controller accepts locale parameter"
check_text_in_file "src/controllers/fpa/reports.controller.ts" "I18nService" "FPA reports controller injects I18nService"

echo -e "${YELLOW}5. Checking Services${NC}"
echo ""

check_text_in_file "src/application/measurement-plans/use-cases/export.service.ts" "I18nService" "Plans export service injects I18nService"
check_text_in_file "src/application/measurement-plans/use-cases/export.service.ts" "this.t(" "Plans export service uses translation helper"
check_text_in_file "src/application/measurement-plans/use-cases/export.service.ts" "locale: string" "Plans export service accepts locale parameter"

echo -e "${YELLOW}6. Checking DTO${NC}"
echo ""

check_text_in_file "src/application/measurement-plans/dtos/export.dto.ts" "locale?: string" "Export DTO includes locale field"

echo -e "${YELLOW}7. Checking Package Dependencies${NC}"
echo ""

check_text_in_file "package.json" "nestjs-i18n" "nestjs-i18n is installed"

echo -e "${YELLOW}8. Checking Build${NC}"
echo ""

if [ -d "dist" ]; then
  echo -e "${GREEN}✓${NC} Project has been built (dist directory exists)"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${RED}✗${NC} Project needs to be built (dist directory not found)"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
echo ""

# Summary
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Total Checks: $((CHECKS_PASSED + CHECKS_FAILED))"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! i18n setup is complete.${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo "1. Start the server: npm run start:dev"
  echo "2. Test exports with ?locale=en (English) or ?locale=pt (Portuguese)"
  echo ""
  echo -e "${BLUE}Example API Calls:${NC}"
  echo "  FPA Summary Report (Portuguese):"
  echo "    GET /estimates/reports/:id/summary?format=pdf&locale=pt"
  echo ""
  echo "  Measurement Plan Export (English):"
  echo "    POST /measurement-plans/:orgId/:planId/export"
  echo "    Body: {\"format\":\"pdf\",\"locale\":\"en\",\"options\":{...}}"
  exit 0
else
  echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
  exit 1
fi
