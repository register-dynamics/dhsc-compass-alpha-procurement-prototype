# Core setup
FROM node:26
EXPOSE 3001/tcp
WORKDIR /compass
CMD ["npm", "run", "dev"]

COPY package.json package-lock.json ./
RUN npm ci

COPY . .