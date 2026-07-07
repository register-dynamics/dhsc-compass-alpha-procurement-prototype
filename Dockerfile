# Core setup
FROM node:24
EXPOSE 3000/tcp
WORKDIR /compass
CMD ["npm", "run", "watch"]

# Install the app; this will be mounted over when run in dev mode, though, so until we're actually building for prod let's skip that bit
# ADD . /compass