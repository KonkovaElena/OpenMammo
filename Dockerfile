FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4030 \
    NPM_CONFIG_LOGLEVEL=warn
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN chown -R node:node /app
USER node
EXPOSE 4030
CMD ["node", "dist/index.js"]