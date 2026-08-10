#!/bin/sh

set -e

EXTRA_ARGS="-p 3000:3000"
PORT=3000
BUILD_DB=1

while [ "$#" -gt 0 ]
do
    case "$1" in
        -p)
            if [ -z "$2" ]; then
                echo "Missing value for -p"
                echo "Usage: ./run.sh [-p PORT_NUMBER] [--use-my-db]"
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
            echo "Usage: ./run.sh [-p PORT_NUMBER] [--build-db]"
            exit 1
            ;;
    esac
done

if [ "$BUILD_DB" = "1" ]; then
    ./build.sh --build-db
else
    ./build.sh
fi

echo "RUNNING THE SITE ON http://localhost:$PORT/"
echo "Press Ctrl+C to stop it"

docker run -it --rm --name dhsc-compass -v "$PWD"/app:/compass/app $EXTRA_ARGS dhsc-compass
