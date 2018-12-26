const { getToken } = require('../twilio');

function authenticateOperator(socket, data, callback) {
  const token = getToken(data.user.userName);
  return callback(null, token.toJwt());
}

function authenticateCustomer(socket, data, callback) {
  return callback(null, true);
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
