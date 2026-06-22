# syntax=docker/dockerfile:1

# ---- Build stage: compile the Vite SPA into dist/ ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Run stage: lightweight server image ----
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the server, the built SPA, and the source consumed server-side.
# server/prompt.js imports src/docs/api-docs.js at runtime to build the prompt.
COPY server ./server
COPY src ./src
COPY --from=build /app/dist ./dist

# Cloud Run sets PORT (typically 8080); default to 8080 for parity.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
