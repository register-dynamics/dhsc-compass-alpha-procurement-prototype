#!/bin/sh

./build.sh

EXTRA_ARGS=""
PORT=3000

if [ x$1 == "x-p" ]
then
    PORT="$2"
    EXTRA_ARGS="-p 127.0.0.1:$PORT:3000"
    shift
    shift
fi

echo "RUNNING THE SITE ON http://localhost:$PORT/"
echo "Press Ctrl+C to stop it"

docker run -it --rm --name dhsc-compass -v "$PWD"/app:/compass/app $EXTRA_ARGS dhsc-compass
