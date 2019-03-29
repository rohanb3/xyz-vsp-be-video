const config = require('config');

const {
  accountSid, apiKey, apiSecret, authToken,
} = config.get('twilio');

exports.TWILIO_ACCOUNT_SID = accountSid;
exports.TWILIO_AUTH_TOKEN = authToken;
exports.TWILIO_API_KEY = apiKey;
exports.TWILIO_API_SECRET = apiSecret;
