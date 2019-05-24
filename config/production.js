const {
  REDIS_PASSWORD,
  LOGSTASH_ENABLED,
  LOGSTASH_PORT,
  LOGSTASH_HOST,
  LOGSTASH_NODE_NAME,
  LOGSTASH_CONNECTION_RETRIES,
  LOGSTASH_CONNECTION_RETRIES_TIMEOUT,
} = process.env;

module.exports = {
  redis: {
    authRequired: true,
    password: REDIS_PASSWORD,
  },
  logstash: {
    enabled: Boolean(LOGSTASH_ENABLED),
    port: LOGSTASH_PORT,
    host: LOGSTASH_HOST,
    nodeName: LOGSTASH_NODE_NAME,
    connectionRetries: Number(LOGSTASH_CONNECTION_RETRIES) || Infinity,
    connectionRetriesTimeout: Number(LOGSTASH_CONNECTION_RETRIES_TIMEOUT) || 60,
  },
  session: {
    setProxy: true,
  },
};
