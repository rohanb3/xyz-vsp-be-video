const config = require('config');

const { publicApiUrl, staticToken } = config.get('httpservicesapi');

exports.PUBLIC_API_URL = publicApiUrl;
exports.STATIC_TOKEN = staticToken;
