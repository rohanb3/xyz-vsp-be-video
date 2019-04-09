const {
  PORT,
  REDIS_HOST,
  REDIS_PORT,
  CALLS_DB_URI,
  CALLS_DB_NAME,
  HTTP_SESSION_SECRET,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} = process.env;

module.exports = {
  server: {
    port: PORT || 3000,
  },
  console: {
    enabled: true,
  },
  redis: {
    port: REDIS_PORT || 6379,
    host: REDIS_HOST || '127.0.0.1',
    authRequired: false,
  },
  logstash: {
    enabled: false,
  },
  mongoose: {
    connectionString: CALLS_DB_URI || 'mongodb://customer:secret123@ds111765.mlab.com:11765/calls',
    dbName: CALLS_DB_NAME || 'calls',
    debug: true,
  },
  session: {
    enabled: true,
    secret: HTTP_SESSION_SECRET || 'wipers',
  },
  twilio: {
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    apiKey: TWILIO_API_KEY,
    apiSecret: TWILIO_API_SECRET,
  },
};
