FROM alpine:3.4
MAINTAINER Alex Tucker <alex@floop.org.uk>

WORKDIR /app
COPY package.json ./
RUN apk add --no-cache nodejs && \
  npm install -g && \
  npm cache clean
ENV NODE_PATH=/usr/lib/node_modules/vis/node_modules
EXPOSE 3000
VOLUME /app
CMD npm start