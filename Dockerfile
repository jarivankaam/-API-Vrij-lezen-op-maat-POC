FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock prisma7.config.ts ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json prisma7.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src/database/seed ./src/database/seed
COPY src/books/schemas ./src/books/schemas
COPY src/users/dto ./src/users/dto

EXPOSE 3000
CMD ["sh", "-c", "bun run prisma:deploy && bun run seed:mongo && bun run seed:postgres && bun run start:prod"]
