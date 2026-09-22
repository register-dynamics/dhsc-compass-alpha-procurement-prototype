#!/bin/sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"

if [ ! -d "$BETA_DIR" ]; then
    echo "Could not find beta project at $BETA_DIR"
    exit 1
fi

docker exec -i compass-beta-db-1 psql -U compass compass < $BETA_DIR/database/fake-data/external.sql

docker exec -i compass-beta-db-1 psql -U compass compass < $BETA_DIR/database/fake-data/app.sql
