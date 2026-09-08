#!/bin/sh

set -e

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

# Build our app

docker compose build

# Prefetch postgresql; make sure the version matches what's in the compose.yaml file

# TODO: Build a custom postgres image on this base that includes some database
# init .sql files to load the schema and sample data - see
# https://github.com/docker-library/docs/blob/master/postgres/README.md#initialization-scripts
# for details

docker pull postgres:18.6
