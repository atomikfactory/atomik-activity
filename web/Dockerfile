FROM node:20-alpine AS build
WORKDIR /src

# Install dependencies first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Build the SPA
COPY . .
RUN npm run build

# ─── Runtime image (nginx serving the static SPA) ────────────────────────────
FROM nginx:alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
