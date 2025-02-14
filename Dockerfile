# syntax = docker/dockerfile:1

# Set the Node.js version (adjust if needed)
ARG NODE_VERSION=20.18.0

# Base image for the final runtime
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

# Set production environment and port
ENV NODE_ENV="production"
ENV PORT=8080

# Build stage to compile dependencies (if you have native addons, etc.)
FROM base AS build

# Install build dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install node modules
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Final image: copy built application from the build stage
FROM base

COPY --from=build /app /app

# Expose the port that your app listens on.
EXPOSE 8080

# Run your application using the start script in package.json.
CMD ["npm", "run", "start"]
