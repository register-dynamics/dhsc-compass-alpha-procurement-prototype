# Core setup
FROM node:26
EXPOSE 3001/tcp
WORKDIR /compass
CMD ["npm", "run", "dev"]

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Install sqlite3 and build the database, not making this optional as we'll be dropping sqlite3 soon anyway
RUN apt-get update && \
    apt-get install -y --no-install-recommends sqlite3 && \
    rm -rf /var/lib/apt/lists/* && \
    sqlite3 database.db < schema.sql