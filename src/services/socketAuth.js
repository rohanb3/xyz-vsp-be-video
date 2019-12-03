const twilio = require('@/services/twilio');
const publicApi = require('@/services/httpServices/publicApiRequests');
const identityApi = require('@/services/httpServices/identityApiRequests');

const { connectionsHeap } = require('@/services/connectionsHeap');
const { TOKEN_INVALID } = require('@/constants/connection');

const NO_IDENTITY = 'identity.not.provided';
const NO_DEVICE_ID = 'device.id.not.provided';

async function authenticateOperator(
  disconnectCallBack,
  socket,
  data,
  callback
) {
  const { identity, token } = data;

  if (!identity) {
    return callback(new Error(NO_IDENTITY));
  }

  const tokenValid = await identityApi.checkTokenValidity(token);

  if (!tokenValid) {
    return callback(new Error(TOKEN_INVALID));
  }

  const companyId = await identityApi.getCompanyIdByUserId(identity);
  const tenantId = await publicApi.getTenantIdByCompanyId(companyId);

  const oldSocket = await connectionsHeap.get(identity);
  if (oldSocket) {
    disconnectCallBack(
      !oldSocket.activeCallId ? oldSocket.socketId : socket.id
    );
  }
  const twilioToken = twilio.getToken(identity);

  socket.identity = identity;
  socket.tenantId = tenantId;

  callback(null, twilioToken);
}

async function authenticateCustomer(socket, data, callback) {
  const { identity, deviceId, token } = data;

  if (!identity) {
    return callback(new Error(NO_IDENTITY));
  }
  if (!deviceId) {
    return callback(new Error(NO_DEVICE_ID));
  }

  const tokenValid = await identityApi.checkTokenValidity(token);

  if (!tokenValid) {
    return callback(new Error(TOKEN_INVALID));
  }

  const companyId = await identityApi.getCompanyIdByUserId(identity);
  const tenantId = await publicApi.getTenantIdByCompanyId(companyId);

  const twilioToken = twilio.getToken(identity);
  socket.identity = identity;
  socket.deviceId = deviceId;
  socket.tenantId = tenantId;

  callback(null, twilioToken);
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;
