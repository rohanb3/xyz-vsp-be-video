FROM keymetrics/pm2:latest-alpine

RUN mkdir -p /app
WORKDIR /app

COPY . .
RUN npm install

CMD [ "pm2-runtime", "process.yml" ]
