const { getToken } = require('@/services/twilio');
const { connectionsHeap } = require('@/services/connectionsHeap');

const NO_IDENTITY = 'identity.not.provided';
const ALREADY_LOGGED_IN = 'already.logged.in';

function authenticateOperator(socket, data, callback) {
  const { identity } = data;
  if (!identity) {
    return callback(new Error(NO_IDENTITY));
  }
  return connectionsHeap.isExist(identity).then((isExist) => {
    if (isExist) {
      return callback(new Error(ALREADY_LOGGED_IN));
    }
    const token = getToken(identity);
    socket.identity = identity;
    return callback(null, token);
  });
}

function authenticateCustomer(socket, data, callback) {
  const { identity, deviceId } = data;
  if (!identity) {
    return callback(new Error(NO_IDENTITY));
  }
  const token = getToken(identity);
  socket.identity = identity;
  socket.deviceId = deviceId;
  return callback(null, token);
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
