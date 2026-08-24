npm#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ALPHA_DIR="$SCRIPT_DIR/src/alpha-prototype"

if [ ! -d "$ALPHA_DIR" ]; then
    echo "Could not find alpha project at $ALPHA_DIR"
    exit 1
fi

EXTRA_ARGS="-p 3000:3000"
PORT=3000
BUILD_DB=1

while [ "$#" -gt 0 ]
do
    case "$1" in
        -p)
            if [ -z "$2" ]; then
                echo "Missing value for -p"
                echo "Usage: ./run-alpha.sh [-p PORT_NUMBER] [--use-my-db]"
                exit 1
            fi
            PORT="$2"
            EXTRA_ARGS="-p $PORT:3000"
            shift
            shift
            ;;
        --use-my-db)
            BUILD_DB=0
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run-alpha.sh [-p PORT_NUMBER] [--use-my-db]"
            exit 1
            ;;
    esac
done

if [ "$BUILD_DB" = "1" ]; then
    (cd "$ALPHA_DIR" && ./build.sh --build-db)
else
    (cd "$ALPHA_DIR" && ./build.sh)
fi

echo "RUNNING THE SITE ON http://localhost:$PORT/"
echo "Press Ctrl+C to stop it"

docker run -it --rm --name dhsc-compass -v "$ALPHA_DIR"/app:/compass/app $EXTRA_ARGS dhsc-compass
