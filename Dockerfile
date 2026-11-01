FROM --platform=$BUILDPLATFORM oven/bun:1.4-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY src ./src

FROM oven/bun:1.4-alpine

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json

ENV DEFAULT_ADDRESS=0.0.0.0:4000
EXPOSE 4000

ENTRYPOINT ["bun", "run", "start"]
