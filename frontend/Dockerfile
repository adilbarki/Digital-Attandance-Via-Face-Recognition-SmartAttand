# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY frontend/package*.json ./

# Dependencies install karo
RUN npm install

# Frontend code copy karo
COPY frontend/ .

# Build karo
RUN npm run build

# Production stage
FROM nginx:alpine

# Build output copy karo
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config copy karo
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]