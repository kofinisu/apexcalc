#!/usr/bin/env bash
set -euo pipefail
if ! command -v convert >/dev/null 2>&1; then
  echo "Install ImageMagick first."
  exit 1
fi
convert -background none -resize 180x180 assets/icons/icon-192.svg assets/icons/apple-touch-icon.png
echo "Wrote assets/icons/apple-touch-icon.png"