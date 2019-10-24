const config = require('config');

const {
    apiKey, apiSecret, applicationId, privateKey,
} = config.get('nexmo');

exports.NEXMO_API_KEY = apiKey;
exports.NEXMO_API_SECRET = apiSecret;
exports.NEXMO_APPLICATION_ID = applicationId;
exports.NEXMO_PATH_TO_PRIVATE_KEY = privateKey;
