const { getToken } = require('@/services/twilio');

function authenticateOperator(socket, data, callback) {
  console.log('operator connected', data);
  const token = getToken(data.userName);
  return callback(null, token.toJwt());
}

function authenticateCustomer(socket, data, callback) {
  console.log('customer conected', data);
  const token = getToken(data.userName);
  return callback(null, token.toJwt());
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
