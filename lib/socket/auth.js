const { getToken } = require('../twilio');

function authenticateOperator(socket, data, callback) {
  const token = getToken(data.user.userName);
  return callback(null, token.toJwt());
}

function authenticateCustomer(socket, data, callback) {
  const token = getToken(data.user.userName);
  return callback(null, token.toJwt());
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
