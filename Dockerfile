FROM node:18 as builder
WORKDIR /usr/src/app
COPY . ./
RUN npm install
RUN echo "Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGltcG9ydC9uby1hbm9ueW1vdXMtZGVmYXVsdC1leHBvcnQKZXhwb3J0IGRlZmF1bHQgewogICAgQVVUSF9UWVBFOiAiQmVhcmVyIiwKICAgIERMX1JPVVRFOiAiZG93bmxvYWQiLAogICAgQVVUSF9ST1VURTogImF1dGgiLAogICAgUVVFU1RJT05OQUlSRV9QUkVGSVg6ICJodHRwczovL2doaC51bmltZWRpemluLW1haW56LmRlL2ZoaXIvcXVlc3Rpb25uYWlyZS8iLAogICAgQkFDS0VORF9UTEQ6ICJnaGg0LnVuaW1lZGl6aW4tbWFpbnouZGUiLAogICAgQkFTRV9QQVRIOiAiLyIsCn07Cg==" | base64 -d > ./src/config.js
RUN npm run build

FROM nginxinc/nginx-unprivileged:latest
COPY --from=builder /usr/src/app/out /usr/share/nginx/html

COPY compass-downloader-web.conf /etc/nginx/conf.d/compass-downloader-web.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]