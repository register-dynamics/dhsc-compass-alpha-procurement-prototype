#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"

if [ ! -d "$BETA_DIR" ]; then
    echo "Could not find beta project at $BETA_DIR"
    exit 1
fi

while [ "$#" -gt 0 ]
do
    case "$1" in
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run-beta.sh"
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

docker compose up -d

# Start the app

echo "RUNNING THE SITE ON http://localhost:3001/"
echo "Run ./stop-beta.sh to stop it"
