const { getToken } = require('@/services/twilio');

function authenticateOperator(socket, data, callback) {
  const token = getToken(data.userName);
  return callback(null, token.toJwt());
}

function authenticateCustomer(socket, data, callback) {
  const token = getToken(data.userName);
  return callback(null, token.toJwt());
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
