#!/bin/sh

BUILD_DB=0

while [ "$#" -gt 0 ]
do
	case "$1" in
		--build-db)
			BUILD_DB=1
			;;
		*)
			echo "Unknown option: $1"
			echo "Usage: ./build.sh [--build-db]"
			exit 1
			;;
	esac
	shift
done

docker build --build-arg BUILD_DB="$BUILD_DB" -t dhsc-compass .
