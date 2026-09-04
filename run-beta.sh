#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"

if [ ! -d "$BETA_DIR" ]; then
    echo "Could not find beta project at $BETA_DIR"
    exit 1
fi

EXTRA_ARGS="-p 3001:3001"
PORT=3001

while [ "$#" -gt 0 ]
do
    case "$1" in
        -p)
            if [ -z "$2" ]; then
                echo "Missing value for -p"
                echo "Usage: ./run-beta.sh [-p PORT_NUMBER] [--use-my-db]"
                exit 1
            fi
            PORT="$2"
            EXTRA_ARGS="-p $PORT:3001"
            shift
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run-beta.sh [-p PORT_NUMBER]"
            exit 1
            ;;
    esac
done

(cd "$BETA_DIR" && ./build.sh)

echo "RUNNING THE SITE ON http://localhost:$PORT/"
echo "Press Ctrl+C to stop it"

# FIXME: Should we bind in all the other .ts files and interesting directories?
docker run -it --rm --name dhsc-compass-beta -v "$BETA_DIR"/views:/compass/views $EXTRA_ARGS dhsc-compass-beta
