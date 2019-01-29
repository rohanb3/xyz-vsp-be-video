FROM keymetrics/pm2:latest-alpine

WORKDIR /var/www/app

ENV PATH /var/www/app/node_modules/.bin:$PATH

COPY package.json /var/www/app/package.json
RUN npm install

CMD [ "pm2-runtime", "process.yml" ]
