const config = require('config');

const { idetityApiUrl, staticToken } = config.get('httpservicesapi');

exports.IDENTITY_API_URL = idetityApiUrl;
exports.STATIC_TOKEN = staticToken;
