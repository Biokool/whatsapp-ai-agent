# ============================================================
# WhatsApp AI Agent — Dockerfile multi-stage
# ============================================================

# --- Stage 1: Build ---
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY src ./src
COPY prompts ./prompts
COPY scripts ./scripts
COPY config ./config
COPY tsconfig.json next.config.ts postcss.config.mjs ./

RUN mkdir -p data auth

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start:all"]
