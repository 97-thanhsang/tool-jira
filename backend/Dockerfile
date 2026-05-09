# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# SQLite data volume (ignored when using PostgreSQL via DATABASE_URL)
VOLUME ["/app/data"]

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
