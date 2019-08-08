const twilio = require('@/services/twilio');
const { connectionsHeap } = require('@/services/connectionsHeap');

const NO_IDENTITY = 'identity.not.provided';
const NO_DEVICE_ID = 'device.id.not.provided';
// const ALREADY_LOGGED_IN = 'already.logged.in';

function authenticateOperator(socket, data, callback) {
  const { identity } = data;
  if (!identity) {
    return Promise.reject(new Error(NO_IDENTITY)).catch(callback);
  }
  return connectionsHeap.isExist(identity).then(() => {
    // if (isExist) {
    //   return callback(new Error(ALREADY_LOGGED_IN));
    //}
    const token = twilio.getToken(identity);
    socket.identity = identity;
    return callback(null, token);
  });
}

function authenticateCustomer(socket, data, callback) {
  const { identity, deviceId } = data;
  if (!identity) {
    return Promise.reject(new Error(NO_IDENTITY)).catch(callback);
  }
  if (!deviceId) {
    return Promise.reject(new Error(NO_DEVICE_ID)).catch(callback);
  }
  const token = twilio.getToken(identity);
  socket.identity = identity;
  socket.deviceId = deviceId;
  return Promise.resolve().then(() => callback(null, token));
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
