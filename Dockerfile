FROM keymetrics/pm2:latest-alpine

COPY ./app/ ./app
RUN npm install

CMD [ "pm2-runtime", "process.yml" ]
