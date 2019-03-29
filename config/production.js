const {
  REDIS_PASSWORD, LOGSTASH_PORT, LOGSTASH_HOST, LOGSTASH_NODE_NAME,
} = process.env;

module.exports = {
  redis: {
    authRequired: true,
    password: REDIS_PASSWORD,
  },
  logstash: {
    enabled: true,
    port: LOGSTASH_PORT,
    host: LOGSTASH_HOST,
    nodeName: LOGSTASH_NODE_NAME,
  },
  session: {
    setProxy: true,
  },
};
