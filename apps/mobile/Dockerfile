FROM node:24-slim AS build
WORKDIR /app
ENV EXPO_NO_TELEMETRY=1
COPY package*.json ./
RUN npm ci
COPY . .
# The web build talks to the API through the same origin; Caddy proxies /api.
ENV EXPO_PUBLIC_API_URL=/api
RUN npx expo export --platform web

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
