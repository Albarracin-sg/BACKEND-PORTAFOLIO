# Stage 1: Base
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

# Stage 3: Builder
FROM base AS builder
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN pnpm prisma:generate
RUN pnpm build
RUN pnpm prune --prod --ignore-scripts

# Stage 4: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/ops ./ops

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 6767

CMD ["node", "dist/src/main.js"]
