FROM keymetrics/pm2:latest-alpine

RUN mkdir -p /xyz-vsp-be-video
WORKDIR /xyz-vsp-be-video

COPY . .
RUN npm install

CMD [ "pm2-runtime", "process.yml" ]
