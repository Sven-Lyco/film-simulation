# Exact Node.js release, so a build can never fall back to an older cached image.
# Dependabot (.github/dependabot.yml) opens a pull request for newer 24.x releases.
FROM node:24.22.2-alpine AS builder
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production

# Security fixes for Alpine packages that are newer than the base image
RUN apk upgrade --no-cache

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
