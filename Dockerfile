# syntax=docker/dockerfile:1

# Build (inclui devDependencies para nest build)
FROM node:22-alpine AS builder

ARG NODE_OPTIONS=--max-old-space-size=512

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_OPTIONS=${NODE_OPTIONS}
RUN npm run build

# Runtime: só produção; escuta na 3000 (compose mapeia *:3000)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/sintegra_urls.json ./sintegra_urls.json
# node precisa gravar token.json e atualizar sintegra_urls.json em runtime
RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
