FROM keymetrics/pm2:latest-alpine

WORKDIR '/var/www/app'
COPY ./ /var/www/app/
RUN ls  /var/www/app/
RUN npm install

ENV NODE_ENV development
ENV PORT 3000
ENV TWILIO_ACCOUNT_SID AC277426ccc49cc8b42fb938a4c4ea09a3
ENV TWILIO_AUTH_TOKEN 41c2455b59bde804fdf330bf68449cbc
ENV TWILIO_API_KEY SK7750f1bc5f5bb71fe65d8c7c6c21210c
ENV TWILIO_API_SECRET tzuP8urt3dgZxg30LnOYdn9w9xmHciGB
ENV MONGO_URI mongodb://8be6cefd-0ee0-4-231-b9ee:YLo7SWYwiDXb5RTeHJ8cI6UdEL9ZKa8r1SroQpTs1OiZSMsjWwA6LkZsVYkRNVLmslVLWDxsST7dqkK8QCfa0Q%3D%3D@8be6cefd-0ee0-4-231-b9ee.documents.azure.com:10255/?ssl=true

EXPOSE 3000 3000

CMD [ "pm2-runtime", "start", "process.yml" ]
