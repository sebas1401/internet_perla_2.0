FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:20 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
ARG CACHE_BUSTER=1
COPY . .
RUN npm run build

FROM node:20 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY .env.example ./.env
EXPOSE 3000
CMD ["node","dist/main.js"]

