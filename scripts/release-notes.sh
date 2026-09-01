#!/usr/bin/env bash
# Builds the full Slack-mrkdwn release notes message for the React Native SDK:
# a platform + version/date header, PRs grouped into "What's New" / "Fixes" /
# "Docs" by their conventional-commit type prefix, and a full-diff compare link.
#
# For each PR whose (current) title contains a bare Jira ticket ID (e.g.
# RE-1243), links the ticket ID to Jira and strips it out of the displayed
# description. Reads the LIVE PR title via `gh pr view` (not the frozen commit
# message), so a PR title renamed after merge is picked up on the next release.
#
# Usage: release-notes.sh <git-range> <owner/repo> <version> <prev-tag-or-empty>
#   release-notes.sh v3.0.0..HEAD recurly/recurly-engage-react-native-sdk-build 3.0.1 v3.0.0
set -euo pipefail

RANGE="$1"
REPO="$2"
VERSION="$3"
PREV_TAG="${4:-}"
JIRA_BASE="https://recurly.atlassian.net/browse"

WHATS_NEW=""
FIXES=""
DOCS=""

format_line() {
  local title="$1" num="$2"
  local pr_link="<https://github.com/$REPO/pull/$num|#$num>"

  # Drop the leading conventional-commit type prefix (fix:, feat(scope):, docs!:, ...)
  # — redundant once the line is already grouped under a "Fixes"/"Docs" heading.
  local clean_title="${title#*: }"
  if [[ "$clean_title" == "$title" ]]; then
    clean_title="$title"
  fi

  if [[ "$clean_title" =~ (RE-[0-9]+) ]]; then
    local ticket="${BASH_REMATCH[1]}"
    clean_title="${clean_title/$ticket/}"
    clean_title="$(echo "$clean_title" | sed -E 's/[[:space:]]+/ /g; s/^[[:space:]]+//; s/[[:space:]]+$//')"
    printf '• _<%s/%s|%s>_: %s [%s]\n' "$JIRA_BASE" "$ticket" "$ticket" "$clean_title" "$pr_link"
  else
    printf '• %s [%s]\n' "$clean_title" "$pr_link"
  fi
}

while IFS= read -r subject; do
  [[ "$subject" =~ \(#([0-9]+)\)[[:space:]]*$ ]] || continue
  num="${BASH_REMATCH[1]}"
  title=$(gh pr view "$num" --repo "$REPO" --json title -q .title 2>/dev/null || echo "")
  [ -z "$title" ] && continue

  line=$(format_line "$title" "$num")

  if [[ "$title" =~ ^(fix|docs)(\(|!|:) ]]; then
    case "${BASH_REMATCH[1]}" in
      fix) FIXES+="$line"$'\n' ;;
      docs) DOCS+="$line"$'\n' ;;
    esac
  else
    WHATS_NEW+="$line"$'\n'
  fi
done < <(git log "$RANGE" --pretty='%s')

echo ":rocket: *React Native SDK — Release v${VERSION} — $(date '+%-d %B %Y')*"
echo ""
echo "*:sparkles: What's New*"
if [ -n "$WHATS_NEW" ]; then printf '%s' "$WHATS_NEW"; else echo "_(none this release)_"; fi
echo ""
echo "*:bug: Fixes*"
if [ -n "$FIXES" ]; then printf '%s' "$FIXES"; else echo "_(none this release)_"; fi
echo ""
echo "*:page_facing_up: Docs*"
if [ -n "$DOCS" ]; then printf '%s' "$DOCS"; else echo "_(none this release)_"; fi
echo ""
if [ -n "$PREV_TAG" ]; then
  echo "Full diff: https://github.com/$REPO/compare/${PREV_TAG}...v${VERSION}"
fi
