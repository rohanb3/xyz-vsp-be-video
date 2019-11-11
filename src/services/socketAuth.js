const twilio = require('@/services/twilio');
const publicApi = require('@/services/httpServices/publicApiRequests');

const { connectionsHeap } = require('@/services/connectionsHeap');


const NO_IDENTITY = 'identity.not.provided';
const NO_DEVICE_ID = 'device.id.not.provided';

function authenticateOperator(disconnectCallBack, socket, data, callback) {
  const { identity, companyId } = data;

  if (!identity) {
    return Promise.reject(new Error(NO_IDENTITY)).catch(callback);
  }

  return connectionsHeap.get(identity).then((oldSocket)=>{    
        if (oldSocket) {
          disconnectCallBack(!oldSocket.activeCallId ? oldSocket.socketId : socket.id);
        }

    const token = twilio.getToken(identity);
    socket.identity = identity;

    const serviceProvider = publicApi.getServiceProviderByCompanyId(companyId);
    socket.serviceProvider = serviceProvider;
    callback(null, token);
  });
}

function authenticateCustomer(socket, data, callback) {
  const { identity, deviceId, companyId } = data;
  if (!identity) {
    return Promise.reject(new Error(NO_IDENTITY)).catch(callback);
  }
  if (!deviceId) {
    return Promise.reject(new Error(NO_DEVICE_ID)).catch(callback);
  }
  const token = twilio.getToken(identity);
  socket.identity = identity;
  socket.deviceId = deviceId;

  const serviceProvider = publicApi.getServiceProviderByCompanyId(companyId);
  socket.serviceProvider = serviceProvider;
  return Promise.resolve().then(() => callback(null, token));
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
