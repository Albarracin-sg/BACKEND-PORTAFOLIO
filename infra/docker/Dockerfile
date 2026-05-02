FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache openssl libc6-compat
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN pnpm prisma:generate
RUN pnpm build

FROM base AS production-deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY --from=dependencies /app/node_modules ./node_modules
RUN pnpm prune --prod --ignore-scripts
RUN pnpm prisma:generate

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/ops ./ops
COPY --from=builder /app/infra/docker/start.sh ./infra/docker/start.sh

RUN mkdir -p uploads && chmod +x ./infra/docker/start.sh

EXPOSE 6767

CMD ["./infra/docker/start.sh"]
