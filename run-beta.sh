#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"

if [ ! -d "$BETA_DIR" ]; then
    echo "Could not find beta project at $BETA_DIR"
    exit 1
fi

BACKGROUND=NO

while [ "$#" -gt 0 ]
do
    case "$1" in
        --background)
            BACKGROUND=YES
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run-beta.sh [--background]"
            exit 1
            ;;
    esac
done

# Run from the beta dir
cd "$BETA_DIR"

# Build the container images
./build.sh

# Pick a highly secure default postgresql password, if we haven't got one already

if [ ! -f postgres-passwd ]
then
    echo "compass" > postgres-passwd
fi

# Fire up the engines

echo "RUNNING THE SITE ON http://localhost:3001/"
echo "Press ctrl+c to stop it"

if [ $BACKGROUND = YES ]
then
    docker compose up --detach
else
    docker compose up --watch
fi
