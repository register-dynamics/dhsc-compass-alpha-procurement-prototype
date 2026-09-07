#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"

if [ ! -d "$BETA_DIR" ]; then
    echo "Could not find beta project at $BETA_DIR"
    exit 1
fi

cd "$BETA_DIR"

docker compose down
