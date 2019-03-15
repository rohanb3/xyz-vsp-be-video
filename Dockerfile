FROM keymetrics/pm2:latest-alpine

WORKDIR /app

COPY ./app/ ./app
RUN npm install

CMD [ "pm2-runtime", "process.yml" ]
