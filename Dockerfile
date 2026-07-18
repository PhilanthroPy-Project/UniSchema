FROM node:22-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM node:22-slim

WORKDIR /app

# node:22-slim (Debian/glibc) so better-sqlite3 installs a prebuilt binary
# (its prebuilds don't cover Alpine/musl — that made this image fail to build).
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl jq \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY samples/ ./samples/
COPY scripts/demo-webhook.sh ./scripts/demo-webhook.sh
RUN chmod +x ./scripts/demo-webhook.sh

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=3000
ENV SERVE_FRONTEND=true
ENV EGRESS_TARGET=local
ENV EGRESS_LOCAL_DIR=/app/data/egress
ENV DATABASE_URL=/app/data/unischema.db

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -sf "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["npm", "start"]
