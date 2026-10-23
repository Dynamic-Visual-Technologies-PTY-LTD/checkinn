# CheckInn image for Azure Container Apps. Built in CI by deploy.yml.
# Multi-stage: install, build, then a slim runtime with production
# dependencies only, running as the non-root node user (uid 1000).

FROM node:24-bookworm-slim AS deps
WORKDIR /app
# better-sqlite3 runs node-gyp on install. It uses the prebuilt Linux binary
# that ships in the package, but node-gyp still needs Python and a toolchain.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
 && npm prune --omit=dev --no-audit --no-fund \
 && rm -rf .next/cache

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
# Only what `next start` needs, plus the migrations and the seed that
# src/db/client.ts reads from the working directory on first start.
COPY --from=build /app/package.json /app/package-lock.json /app/next.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/data/seed ./data/seed
# Next.js may write under .next at runtime, so the node user owns it.
COPY --from=build --chown=node:node /app/.next ./.next
USER node
EXPOSE 3000
# Run next directly so the app is the container's only Node process and
# receives SIGTERM itself.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
