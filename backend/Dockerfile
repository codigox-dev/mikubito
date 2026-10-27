FROM node:22-alpine AS deps

RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY src ./src

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

# Aplica migraciones pendientes y arranca el servidor.
# Para el seed inicial, ejecuta `npm run seed` como tarea one-off.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
