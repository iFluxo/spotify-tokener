FROM --platform=$BUILDPLATFORM oven/bun:1.4-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --omit=dev

COPY src ./src

FROM oven/bun:1.4-alpine

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json

ENV SPOTIFY_TOKENER_ADDR=0.0.0.0:8080
EXPOSE 8080

ENTRYPOINT ["bun", "run", "start"]
