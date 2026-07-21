# Container image for the Anakin MCP server.
#
# The server speaks MCP over stdio, so the container is driven by attaching to
# its stdin/stdout rather than by exposing a port:
#
#   docker run -i --rm -e ANAKIN_API_KEY=ak-... anakin-mcp
#
# Directory listings and indexers (Glama) build this to verify the server
# starts, so it must succeed without network access to anything but npm.

FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies against the lockfile first so this layer caches.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies reach the final image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

# Never run as root; the server needs no elevated access.
USER node

ENTRYPOINT ["node", "dist/cli.js"]
