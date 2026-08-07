#!/bin/bash

# Parse --workspace flag early
WORKSPACE=""
for arg in "$@"; do
  case "$arg" in
    --workspace=*) WORKSPACE="${arg#--workspace=}" ;;
  esac
done

if [[ "$WORKSPACE" != "tv" && "$WORKSPACE" != "example" ]]; then
  echo "Usage: $0 --workspace=tv|example"
  exit 1
fi

# List all available simulators
DEVICES_RAW=$(xcrun simctl list devices available 2>/dev/null)

# Parse into name, UDID, and OS version arrays (section headers carry the OS version)
declare -a NAMES
declare -a UDIDS
declare -a OS_VERSIONS

CURRENT_OS=""
while IFS= read -r line; do
  # Match section headers like "-- iOS 18.2 --" or "-- tvOS 18.2 --"
  if [[ "$line" =~ ^--[[:space:]](.+)[[:space:]]--$ ]]; then
    CURRENT_OS="${BASH_REMATCH[1]}"
    continue
  fi
  UDID=$(echo "$line" | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}')
  if [ -n "$UDID" ]; then
    [[ "$WORKSPACE" == "example" && "$CURRENT_OS" == tvOS* ]] && continue
    [[ "$WORKSPACE" == "tv" && "$CURRENT_OS" != tvOS* ]] && continue
    NAME=$(echo "$line" | sed -E 's/^[[:space:]]+(.+) \([A-F0-9-]+\).*/\1/')
    NAMES+=("$NAME")
    UDIDS+=("$UDID")
    OS_VERSIONS+=("$CURRENT_OS")
  fi
done <<< "$DEVICES_RAW"

COUNT=${#NAMES[@]}
if [ "$COUNT" -eq 0 ]; then
  echo "No simulators found."
  exit 1
fi

echo "Available Simulators:"
echo ""
for ((i=0; i<COUNT; i++)); do
  echo "  $((i+1))) ${NAMES[$i]}  (${OS_VERSIONS[$i]})"
done

echo ""
read -p "Select a device (1-$COUNT): " choice

if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "$COUNT" ]; then
  echo "Invalid selection."
  exit 1
fi

IDX=$((choice-1))
SELECTED_NAME="${NAMES[$IDX]}"
SELECTED_UDID="${UDIDS[$IDX]}"

echo ""
echo "Launching: $SELECTED_NAME ($SELECTED_UDID)"

xcrun simctl boot "$SELECTED_UDID" 2>/dev/null || true
open -a Simulator

case "$WORKSPACE" in
  tv)      EXPO_TV=1 yarn workspace example-tv ios --device "$SELECTED_NAME" ;;
  example) yarn workspace recurly-engage-example start ;;
  *)       echo "Usage: $0 --workspace=tv|example"; exit 1 ;;
esac
