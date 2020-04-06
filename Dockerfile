FROM keymetrics/pm2:latest-alpine

COPY ./app/ ./app

WORKDIR /app

RUN npm install

RUN npm config set strict-ssl false

CMD [ "pm2-runtime", "process.yml" ]
