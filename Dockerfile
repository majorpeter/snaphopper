FROM node:16.20.0-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
COPY backend/package.json backend/package.json
RUN cd backend; npm install

COPY frontend/package.json frontend/package.json
RUN cd frontend; npm install

COPY backend/tsconfig.json backend/
COPY backend/src backend/src
RUN cd backend; npm run-script build

COPY frontend/package.json frontend/tsconfig.json frontend/vite.config.js frontend/index.html frontend/
COPY frontend/src frontend/src
RUN cd frontend; npm run-script build

VOLUME [ "/config" ]
ENV CONFIG_DIR=/config

EXPOSE 8080
ENTRYPOINT [ "node", "backend/dist/server.js" ]
