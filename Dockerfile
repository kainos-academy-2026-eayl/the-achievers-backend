# Stage 1: install only the packages the app needs to run
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# Skip tools that are only needed for building, not running
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --omit=optional

# Delete files for databases we don't use, to keep the image small
RUN find node_modules/@prisma/client/runtime \
      \( -name 'query_compiler_*_bg.cockroachdb.*' -o -name 'query_compiler_*_bg.mysql.*' \
         -o -name 'query_compiler_*_bg.sqlite.*' -o -name 'query_compiler_*_bg.sqlserver.*' \
         -o -name '*.map' \) -delete

# Stage 2: turn our TypeScript code into runnable JavaScript
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

# Set up Prisma, which our code uses to talk to the database.
# On a work network that blocks downloads, build with:
#   docker build --secret id=extra_ca,src=$HOME/kainos-ca.pem .
COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
RUN --mount=type=secret,id=extra_ca \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi \
    && npx prisma generate --config prisma.config.ts

COPY src ./src

# Build the app (Prisma is already set up, so skip doing it again)
RUN npm run build --ignore-scripts

# Stage 3: the final image, with just Node and our built app
FROM alpine:3.24

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /usr/lib/libstdc++.so.6* /usr/lib/libgcc_s.so.1 /usr/lib/

# Create a limited user, so the app doesn't run with full admin rights
RUN addgroup -S -g 1000 node && adduser -S -u 1000 -G node -H -s /sbin/nologin node

# Node needs this file to run our app
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run the app as the limited user, for safety
USER node

CMD ["node", "dist/index.js"]
