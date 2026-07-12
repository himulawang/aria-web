# Build Stage
FROM node:24-alpine AS build-stage

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production Stage
FROM ghcr.io/static-web-server/static-web-server:2-alpine

# Copy the build output from build-stage to the SWS public directory
COPY --from=build-stage /app/dist /public

# SWS Configuration via Environment Variables:
ENV SERVER_ROOT=/public

# Expose port 6881
EXPOSE 6881

# SWS starts automatically as the entrypoint of the image
