# Stage 1: production dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# --omit=optional skips the prisma CLI and typescript
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --omit=optional

# Drop unused Prisma query compilers and source maps
RUN find node_modules/@prisma/client/runtime \
      \( -name 'query_compiler_*_bg.cockroachdb.*' -o -name 'query_compiler_*_bg.mysql.*' \
         -o -name 'query_compiler_*_bg.sqlite.*' -o -name 'query_compiler_*_bg.sqlserver.*' \
         -o -name '*.map' \) -delete

# Stage 2: build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

# Generate the Prisma client before copying src so it stays cached.
# On TLS-intercepting networks, pass your CA bundle:
#   docker build --secret id=extra_ca,src=$HOME/kainos-ca.pem .
COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
RUN --mount=type=secret,id=extra_ca \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi \
    && npx prisma generate --config prisma.config.ts

COPY src ./src

# --ignore-scripts skips the prebuild hook (client already generated)
RUN npm run build --ignore-scripts

# Stage 3: runtime (plain Alpine with only the node binary)
FROM alpine:3.24

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /usr/lib/libstdc++.so.6* /usr/lib/libgcc_s.so.1 /usr/lib/

# Unprivileged user with no login shell or home
RUN addgroup -S -g 1000 node && adduser -S -u 1000 -G node -H -s /sbin/nologin node

# Needed at runtime for "type": "module"
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run as non-root; app files stay root-owned (read-only to the app)
USER node

CMD ["node", "dist/index.js"]
