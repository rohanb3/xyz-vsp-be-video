const {
  PORT,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  CALLS_DB_URI,
  CALLS_DB_NAME,
  HTTP_SESSION_SECRET,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  AZURE_TENANT_NAME,
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  AZURE_POLICY_NAME,
  LOGSTASH_ENABLED,
  LOGSTASH_PORT,
  LOGSTASH_HOST,
  LOGSTASH_NODE_NAME,
  LOGSTASH_CONNECTION_RETRIES,
  LOGSTASH_CONNECTION_RETRIES_TIMEOUT,
} = process.env;

module.exports = {
  server: {
    port: PORT || 3000,
  },
  console: {
    enabled: true,
  },
  redis: {
    port: Number(REDIS_PORT) || 6379,
    host: REDIS_HOST || '127.0.0.1',
    password: REDIS_PASSWORD,
    authRequired: Boolean(REDIS_PASSWORD),
  },
  logstash: {
    enabled: Boolean(LOGSTASH_ENABLED),
    port: LOGSTASH_PORT,
    host: LOGSTASH_HOST,
    nodeName: LOGSTASH_NODE_NAME,
    connectionRetries: Number(LOGSTASH_CONNECTION_RETRIES) || Infinity,
    connectionRetriesTimeout: Number(LOGSTASH_CONNECTION_RETRIES_TIMEOUT) || 60,
  },
  mongoose: {
    connectionString:
      CALLS_DB_URI ||
      'mongodb://customer:secret123@ds111765.mlab.com:11765/calls',
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
  azure: {
    identityMetadata: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration/`,
    issuer: `https://${AZURE_TENANT_NAME}.b2clogin.com/${AZURE_TENANT_ID}/v2.0/`,
    clientID: AZURE_CLIENT_ID,
    policyName: AZURE_POLICY_NAME,
    isB2C: true,
    validateIssuer: true,
    loggingLevel: 'error',
    passReqToCallback: true,
    loggingNoPII: false,
  },
};
