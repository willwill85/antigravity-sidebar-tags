#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/willwill85/antigravity-sidebar-tags.git"
TARGET_DIR="$HOME/.agy-sidebar-tags-repo"

echo "====================================================="
echo "  Antigravity Sidebar Tags - One-Click Installer"
echo "====================================================="

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js (>= 18) is required but was not found in PATH."
  exit 1
fi

if [ -d "$TARGET_DIR/.git" ]; then
  echo "🔄 Updating existing installation in $TARGET_DIR..."
  git -C "$TARGET_DIR" pull --ff-only origin main >/dev/null 2>&1 || true
else
  echo "📥 Cloning $REPO_URL..."
  rm -rf "$TARGET_DIR"
  git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
fi

node "$TARGET_DIR/bin/cli.js" install
