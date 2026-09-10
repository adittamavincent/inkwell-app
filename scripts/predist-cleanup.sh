#!/usr/bin/env bash

# predist-cleanup.sh
# Cleans up stale mounted DMG volumes and temporary build artifacts left by previous electron-builder runs.
# Prevents hdiutil resize failures (Exit code: 35 / EAGAIN - Resource temporarily unavailable).

set -euo pipefail

echo "==> Running pre-dist cleanup..."

# 1. Detect mounted disk devices matching Inkwell volumes or temporary directory paths
# Parse hdiutil info blocks to extract parent dev nodes (/dev/diskX) corresponding to matching image-path or mount points
STALE_DEVS=$(hdiutil info | awk '
  /^image-path/ {
    path = $0
  }
  /\/Volumes\/Inkwell|\/private\/var\/folders\/.*\/T\// {
    matched = 1
  }
  /^\/dev\/disk[0-9]+([[:space:]]|$)/ {
    if (matched || path ~ /\/Volumes\/Inkwell/ || path ~ /\/private\/var\/folders\/.*\/T\//) {
      # Only match top-level disk device node (/dev/diskX), avoiding partition slices (/dev/diskXsY)
      if ($1 ~ /^\/dev\/disk[0-9]+$/) {
        print $1
      }
    }
  }
  /^================================================/ {
    path = ""
    matched = 0
  }
' | sort -u || true)

if [ -n "$STALE_DEVS" ]; then
  echo "Found stale mounted DMG disk image(s):"
  echo "$STALE_DEVS"
  while IFS= read -r dev; do
    if [ -n "$dev" ]; then
      echo "Force-detaching $dev..."
      hdiutil detach "$dev" -force 2>/dev/null || echo "Warning: Failed to detach $dev, continuing..."
    fi
  done <<< "$STALE_DEVS"
else
  echo "No stale mounted DMG disk images found."
fi

# 2. Clean up temporary DMG build directories created by electron-builder
TEMP_DIRS=$(find /private/var/folders -maxdepth 4 -type d -name "t-*" 2>/dev/null || true)

if [ -n "$TEMP_DIRS" ]; then
  echo "Cleaning up temporary electron-builder build directories:"
  echo "$TEMP_DIRS"
  while IFS= read -r dir; do
    if [ -n "$dir" ] && [ -d "$dir" ]; then
      echo "Removing temporary directory: $dir"
      rm -rf "$dir" 2>/dev/null || echo "Warning: Could not remove $dir, continuing..."
    fi
  done <<< "$TEMP_DIRS"
else
  echo "No temporary electron-builder build directories found."
fi

echo "==> Pre-dist cleanup complete!"
