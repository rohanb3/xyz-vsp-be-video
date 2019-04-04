const { getToken } = require('@/services/twilio');

function authenticateOperator(socket, data, callback) {
  const { identity } = data;
  if (!identity) {
    return callback(new Error('No identity provided!'));
  }
  const token = getToken(identity);
  socket.identity = identity;
  return callback(null, token);
}

function authenticateCustomer(socket, data, callback) {
  const { identity } = data;
  if (!identity) {
    return callback(new Error('No identity provided!'));
  }
  const token = getToken(identity);
  socket.identity = identity;
  return callback(null, token);
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
