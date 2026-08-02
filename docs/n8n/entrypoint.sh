#!/bin/sh

# Patch n8n Google Drive upload mimeType bug
# Original: mimeType = binaryData.mimeType (wrong - uses in-memory ref)
# Fixed:    mimeType = metadata.mimeType (correct - uses filesystem metadata)
TARGET="/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-nodes-base@file+packages+nodes-base_@opentelemetry+api@1.9.0_@opentelemetry+exporte_9e31dcec10980323a9c957753d2416c7/node_modules/n8n-nodes-base/dist/nodes/Google/Drive/v2/helpers/utils.js"

if [ -f "$TARGET" ]; then
  # Only patch if not already patched
  if ! grep -q "mimeType = metadata.mimeType" "$TARGET" 2>/dev/null; then
    sed -i '42s/mimeType = binaryData.mimeType;/mimeType = metadata.mimeType;/' "$TARGET"
    echo "[patch] Google Drive mimeType bug fixed"
  else
    echo "[patch] Already patched"
  fi
fi

# Start n8n
exec node /usr/local/lib/node_modules/n8n/bin/n8n
