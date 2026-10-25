FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=768
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build --chown=node:node /app/dist ./dist
# PDF de la biblioteca (volumen library_files): el volumen nuevo hereda este dueño
RUN mkdir -p /app/uploads/library && chown -R node:node /app/uploads
ENV LIBRARY_STORAGE_DIR=/app/uploads/library
USER node
EXPOSE 3002
# node directamente (no pnpm) para que reciba SIGTERM y cierre limpio
CMD ["node", "dist/main"]
