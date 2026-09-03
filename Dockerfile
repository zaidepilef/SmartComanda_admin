# =========================================
# Development (live reload)
# =========================================
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]


# =========================================
# Build Angular
# =========================================
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build -- --base-href /frontend-admin/


# =========================================
# Production - Nginx
# =========================================
FROM nginx:alpine

COPY --from=build /app/dist/SmartComanda_admin/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]