FROM node:18 as builder
WORKDIR /usr/src/app
COPY . ./
RUN npm install
RUN echo "$COMPASS_DOWNLOADER_WEB_CONFIG" | base64 -d > ./src/config.js
RUN npm run build

FROM bitnami/nginx:latest
COPY --from=builder /usr/src/app/out /opt/bitnami/nginx/html
COPY compass-downloader-web.conf /opt/bitnami/nginx/conf/bitnami/compass-downloader-web.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]