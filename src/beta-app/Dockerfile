# Core setup
FROM node:26
EXPOSE 3001/tcp
WORKDIR /compass
CMD ["npm", "run", "dev"]

# Install the app; this will be mounted over when run in dev mode, but we'll need a copy of it in here to run `npm ci` and `npm run build` against.
ADD app.ts config.ts index.ts /compass
ADD assets /compass/assets
ADD controllers /compass/controllers
ADD database /compass/database
ADD middleware /compass/middleware
ADD public /compass/public
ADD routes /compass/routes
ADD types /compass/types
ADD views /compass/views
ADD tsconfig.json package.json package-lock.json /compass

# SQLITE3 database file is required for now, we'll move to postgresql ASAP
ADD database.db /compass

RUN npm install