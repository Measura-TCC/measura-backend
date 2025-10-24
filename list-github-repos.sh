#!/bin/bash

source .env

curl -s "https://api.github.com/user/repos?per_page=100&sort=updated" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" | \
  jq -r '.[] | "\(.full_name) - Open Issues: \(.open_issues_count) - Has Issues: \(.has_issues) - Private: \(.private)"'
