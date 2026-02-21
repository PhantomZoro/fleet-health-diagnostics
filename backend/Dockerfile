# Stage 1 — build TypeScript
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Stage 2 — production runtime
FROM node:20-alpine AS production
WORKDIR /app
COPY package.json package-lock.json ./
# Install production deps in the runtime image (better-sqlite3 is native — must compile here)
RUN npm ci --omit=dev
COPY --from=build /app/dist/ ./dist/
COPY data/seed.log ./data/
EXPOSE 3000
CMD ["node", "dist/index.js"]
