FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Build-time-only placeholders so src/env.ts validation (which now runs eagerly
# when the NextAuth configs are imported while Next.js collects route page data)
# doesn't fail the build. These never reach the runner stage/final image; real
# secrets must be supplied at container runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    ADMIN_AUTH_SECRET="build-time-placeholder-secret-do-not-use-in-prod-1" \
    CUSTOMER_AUTH_SECRET="build-time-placeholder-secret-do-not-use-in-prod-2"
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
