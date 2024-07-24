FROM node:16.7-alpine3.14 as builder

WORKDIR /app

COPY . .

RUN env NODE_ENV=development yarn install
RUN env NODE_ENV=production yarn build

CMD yarn start