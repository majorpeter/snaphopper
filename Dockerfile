FROM node:16.20.0-alpine

WORKDIR /app

COPY backend/package.json backend/package.json

RUN cd backend; npm install

COPY package.json tsconfig.json ./
COPY backend/src backend/src
COPY backend/tsconfig.json backend/
RUN cd backend; npm run-script build

EXPOSE 8080
ENTRYPOINT [ "node", "backend/dist/server.js" ]
