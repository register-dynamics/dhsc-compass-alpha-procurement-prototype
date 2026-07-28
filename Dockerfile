# syntax=docker/dockerfile:1.4
# Core setup
FROM node:24
ARG BUILD_DB=0
EXPOSE 3000/tcp
WORKDIR /compass
CMD ["npm", "run", "watch"]

# Install the app; this will be mounted over when run in dev mode, but we'll need a copy of it in here to run `npm ci` and `npm run build` against.
ADD app /compass/app
ADD lib /compass/lib
ADD tests /compass/tests
ADD app.js gulpfile.js package.json package-lock.json schema.sql /compass

# Use wildcard to add the database file if it exists, but don't fail if it doesn't.
ADD *.db /compass

RUN npm ci --include=dev
RUN npm run build

# Install sqlite3 and build the database if requested.
RUN if [ "$BUILD_DB" = "1" ]; then \
			apt-get update && \
			apt-get install -y --no-install-recommends sqlite3 && \
			rm -rf /var/lib/apt/lists/* && \
			sqlite3 database.db < schema.sql; \
		fi
