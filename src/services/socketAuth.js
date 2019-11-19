const twilio = require('@/services/twilio');
const publicApi = require('@/services/httpServices/publicApiRequests');
const identityApi = require('@/services/httpServices/identityApiRequests');

const { connectionsHeap } = require('@/services/connectionsHeap');

const NO_IDENTITY = 'identity.not.provided';
const NO_DEVICE_ID = 'device.id.not.provided';

async function authenticateOperator(
  disconnectCallBack,
  socket,
  data,
  callback
) {
  const { identity } = data;

  if (!identity) {
    return Promise.reject(new Error(NO_IDENTITY)).catch(callback);
  }

  try {
    const companyId = await identityApi.getCompanyByUserId(identity);
    const tenant = await publicApi.getServiceProviderByCompanyId(companyId);

    const oldSocket = await connectionsHeap.get(identity);
    if (oldSocket) {
      disconnectCallBack(
        !oldSocket.activeCallId ? oldSocket.socketId : socket.id
      );
    }
    const token = twilio.getToken(identity);

    socket.identity = identity;
    socket.tenant = tenant;

    callback(null, token);
  } catch (err) {
    const token = '';
    const e = new Error(err);
    callback(e, token);
    throw e;
  }
}

async function authenticateCustomer(socket, data, callback) {
  const { identity, deviceId } = data;

  if (!identity) {
    return Promise.reject(new Error(NO_IDENTITY)).catch(callback);
  }
  if (!deviceId) {
    return Promise.reject(new Error(NO_DEVICE_ID)).catch(callback);
  }

  try {
    const companyId = await identityApi.getCompanyByUserId(identity);
    const tenant = await publicApi.getServiceProviderByCompanyId(companyId);

    const token = twilio.getToken(identity);
    socket.identity = identity;
    socket.deviceId = deviceId;
    socket.tenant = tenant;

    callback(null, token);
  } catch (err) {
    const token = '';
    const e = new Error(err);
    callback(e, token);
    throw e;
  }
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
