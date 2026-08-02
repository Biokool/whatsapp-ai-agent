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
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# --- PATCH: whatsapp-rust-bridge (0.5.4) fue republicado sin el export "require" ---
# Baileys v7 lo importa desde CJS (tsx). El export map solo tiene "import", lo que
# rompe el arranque del bot con ERR_PACKAGE_PATH_NOT_EXPORTED. Se añade la condición
# "require" apuntando al mismo dist/index.js (mismo fix que el node_modules local).
RUN node -e "const fs=require('fs');const p='node_modules/whatsapp-rust-bridge/package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.exports&&j.exports['.']&&!j.exports['.'].require){j.exports['.'].require=j.exports['.'].import;fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');console.log('patched whatsapp-rust-bridge exports with require');}"

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
