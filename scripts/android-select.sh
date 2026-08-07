#!/bin/bash

# List available AVDs
AVDS=$(emulator -list-avds 2>/dev/null)

if [ -z "$AVDS" ]; then
  echo "No Android Virtual Devices found."
  echo "Create one via Android Studio > Device Manager."
  exit 1
fi

# Display numbered list
echo "Available Android Virtual Devices:"
echo ""
i=1
while IFS= read -r avd; do
  echo "  $i) $avd"
  ((i++))
done <<< "$AVDS"

echo ""
read -p "Select a device (1-$((i-1))): " choice

# Validate input
if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -ge "$i" ]; then
  echo "Invalid selection."
  exit 1
fi

# Get selected AVD name
SELECTED=$(sed -n "${choice}p" <<< "$AVDS")
echo ""
echo "Launching: $SELECTED"

# Boot the emulator in background
emulator -avd "$SELECTED" -wipe-data &

# Wait for device to come online
echo "Waiting for emulator to boot..."
adb wait-for-device

# Run workspace based on --workspace flag (tv | example)
WORKSPACE=""
for arg in "$@"; do
  case "$arg" in
    --workspace=*) WORKSPACE="${arg#--workspace=}" ;;
  esac
done

case "$WORKSPACE" in
  tv)      EXPO_TV=1 yarn workspace example-tv android ;;
  example) yarn workspace recurly-engage-example start ;;
  *)       echo "Usage: $0 --workspace=tv|example"; exit 1 ;;
esac
