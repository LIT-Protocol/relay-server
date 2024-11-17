FROM node:16.7-alpine3.14 as builder

WORKDIR /app

COPY . .

RUN yarn global add @sentry/cli pm2
RUN env NODE_ENV=development yarn install
RUN env NODE_ENV=production yarn build

CMD ["ash", "start.sh"]