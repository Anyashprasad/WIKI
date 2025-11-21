# Use Node 20 (compatible with Cheerio, JSDOM, Undici)
FROM node:20-slim AS base

WORKDIR /app

# Copy only package files to install dependencies first
COPY package.json package-lock.json* pnpm-lock.yaml* /app/

# Install root dependencies (for workspaces)
RUN npm install

# Copy the rest of the project
COPY . .

# ---- Build Phase ----
WORKDIR /app/server
RUN npm install
RUN npm run build

# ---- Run Phase ----
FROM node:20-slim
WORKDIR /app

# Copy built server output only
COPY --from=base /app/server/dist ./dist
COPY --from=base /app/server/package.json .

# Install production dependencies only
RUN npm install --omit=dev

# Expose service port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
