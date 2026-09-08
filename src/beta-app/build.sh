#!/bin/sh

set -e

# Copy the schema from the alpha (TODO: This will be replaced by postgresql setup)
cp ../alpha-prototype/schema.sql .

# Build our app

docker compose build

# Prefetch postgresql; make sure the version matches what's in the compose.yaml file

# TODO: Build a custom postgres image on this base that includes some database
# init .sql files to load the schema and sample data - see
# https://github.com/docker-library/docs/blob/master/postgres/README.md#initialization-scripts
# for details

docker pull postgres:18.6
