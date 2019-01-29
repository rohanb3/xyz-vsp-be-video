FROM keymetrics/pm2:latest-alpine

WORKDIR '/var/www/app'
COPY package.json /var/www/app/package.json
RUN ls  /var/www/app/
RUN npm install

ENV NODE_ENV development
ENV PORT 3000
ENV REDIS_HOST redis
ENV REDIS_PORT 6379
ENV HTTP_SESSION_SECRET wipers
ENV TWILIO_ACCOUNT_SID AC277426ccc49cc8b42fb938a4c4ea09a3
ENV TWILIO_AUTH_TOKEN 41c2455b59bde804fdf330bf68449cbc
ENV TWILIO_API_KEY SK7750f1bc5f5bb71fe65d8c7c6c21210c
ENV TWILIO_API_SECRET tzuP8urt3dgZxg30LnOYdn9w9xmHciGB

EXPOSE 3000 3000

CMD [ "pm2-runtime", "process.yml" ]
