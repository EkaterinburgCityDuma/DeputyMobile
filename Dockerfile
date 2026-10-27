# Этап 1: Сборка
FROM node:20-alpine as build
WORKDIR /app

ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_GEOCODER_API_KEY
ARG EXPO_PUBLIC_YAMAP_API_KEY
ARG EXPO_PUBLIC_X_APP_SECRET
ARG EXPO_PUBLIC_FIREBASE_API_KEY
ARG EXPO_PUBLIC_FIREBASE_PROJECT_ID
ARG EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG EXPO_PUBLIC_FIREBASE_APP_ID
ARG EXPO_PUBLIC_FIREBASE_VAPID_KEY

ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_GEOCODER_API_KEY=$EXPO_PUBLIC_GEOCODER_API_KEY
ENV EXPO_PUBLIC_YAMAP_API_KEY=$EXPO_PUBLIC_YAMAP_API_KEY
ENV EXPO_PUBLIC_X_APP_SECRET=$EXPO_PUBLIC_X_APP_SECRET
ENV EXPO_PUBLIC_FIREBASE_API_KEY=$EXPO_PUBLIC_FIREBASE_API_KEY
ENV EXPO_PUBLIC_FIREBASE_PROJECT_ID=$EXPO_PUBLIC_FIREBASE_PROJECT_ID
ENV EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV EXPO_PUBLIC_FIREBASE_APP_ID=$EXPO_PUBLIC_FIREBASE_APP_ID
ENV EXPO_PUBLIC_FIREBASE_VAPID_KEY=$EXPO_PUBLIC_FIREBASE_VAPID_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN npx expo export -p web

FROM nginx:stable-alpine
# Создаем папку pwa и кладем билд туда
RUN mkdir -p /usr/share/nginx/html/pwa
COPY --from=build /app/dist /usr/share/nginx/html/pwa

RUN echo 'server { \
    listen 8081; \
    root /usr/share/nginx/html; \
    \
    location = /pwa/service-worker.js { \
        add_header Cache-Control "no-cache, no-store, must-revalidate" always; \
    } \
    \
    location = /pwa/manifest.json { \
        add_header Cache-Control "no-cache" always; \
    } \
    \
    location = /pwa/index.html { \
        add_header Cache-Control "no-cache, no-store, must-revalidate" always; \
    } \
    \
    # Правильная обработка манифеста и иконок \
    location ~* \.(json|png|ico|js)$ { \
        root /usr/share/nginx/html; \
        add_header Access-Control-Allow-Origin "*"; \
        expires 1y; \
    } \
    \
    location /pwa/ { \
        alias /usr/share/nginx/html/pwa/; \
        index index.html; \
        try_files $uri $uri/ /pwa/index.html; \
        add_header Cache-Control "no-cache, no-store, must-revalidate" always; \
    } \
    \
    location = / { \
        return 301 /pwa/; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]
