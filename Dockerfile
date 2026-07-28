# Core setup
FROM node:24
EXPOSE 3000/tcp
WORKDIR /compass
CMD ["npm", "run", "watch"]

# Install the app; this will be mounted over when run in dev mode, but we'll need a copy of it in here to run `npm ci` and `npm run build` against.
ADD app /compass/app
ADD lib /compass/lib
ADD tests /compass/tests
ADD app.js gulpfile.js package.json package-lock.json /compass

RUN npm ci --include=dev
RUN npm run build
