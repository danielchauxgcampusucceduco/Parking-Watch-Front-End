FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_BACKEND_API_URL
ARG VITE_BACKEND_WS_URL
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL} \
    VITE_BACKEND_WS_URL=${VITE_BACKEND_WS_URL}
RUN test -n "${VITE_BACKEND_API_URL:-$VITE_API_URL}" \
    && test -n "${VITE_BACKEND_WS_URL:-$VITE_WS_URL}" \
    && pnpm build

FROM nginx:1.27-alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_ORIGIN=https://api.example.com \
    WS_ORIGIN=wss://api.example.com
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
