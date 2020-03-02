const twilio = require('@/services/twilio');
const logger = require('@/services/logger')(module);
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
  logger.debug('Operator: authentification', identity);

  if (!identity) {
    return callback(new Error(NO_IDENTITY));
  }

  const oldSocket = await connectionsHeap.get(identity);
  if (oldSocket) {
    const socketId = !oldSocket.activeCallId ? oldSocket.socketId : socket.id;
    logger.debug('Operator: disconnectCallBack will be called with', socketId);

    disconnectCallBack(socketId);
  } else {
    logger.debug(
      "Operator: disconnectCallBack was not called because oldSocket doesn't exist"
    );
  }

  try {
    const profile = await identityApi.getUserProfile(token);
    const tenantId = await publicApi.getTenantIdByCompanyId(profile.companyId);

    socket.identity = identity;
    socket.securityToken = token;
    socket.securityTokenLastChecked = new Date().getTime();
    socket.tenantId = tenantId;
    socket.role = profile.role;
    socket.permissions = profile.scopes || [];

    logger.debug(
      'Operator: authentification data',
      profile.role,
      profile.scopes
    );
  } catch (e) {
    logger.debug('Operator: authentification error', JSON.stringify(e));
    return callback(new Error(TOKEN_INVALID));
  }

  const twilioToken = twilio.getToken(identity);
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

  try {
    const profile = await identityApi.getUserProfile(token);
    const tenantId = await publicApi.getTenantIdByCompanyId(profile.companyId);

    socket.identity = identity;
    socket.deviceId = deviceId;
    socket.tenantId = tenantId;
    socket.securityToken = token;
    socket.securityTokenLastChecked = new Date().getTime();
    socket.permissions = profile.scopes || [];

    logger.debug(
      'Customer: authentification data',
      profile.role,
      profile.scopes
    );
  } catch (e) {
    logger.debug('Customer: authentification error', JSON.stringify(e));
    return callback(new Error(TOKEN_INVALID));
  }

  const twilioToken = twilio.getToken(identity);
  callback(null, twilioToken);
}

async function verifyConnectionToken(connection) {
  logger.debug('Connection: verify token', connection.identity);

  const now = new Date().getTime();

  if (now - (connection.securityTokenLastChecked || 0) > 1000 * 60) {
    try {
      const profile = await identityApi.getUserProfile(
        connection.securityToken
      );

      connection.securityTokenLastChecked = new Date().getTime();
      connection.permissions = profile.scopes || [];

      logger.debug('Connection: token is correct', connection.identity);
    } catch (e) {
      logger.debug('Connection: invalid token', connection.identity);
      return false;
    }
  } else {
    logger.debug(
      'Connection: token was verified less than 1 minute ago',
      connection.identity
    );
  }

  return true;
}

function checkConnectionPermission(connection, permission) {
  if (!(connection.permissions || []).includes(permission)) {
    logger.debug(
      'Connection: permission denied',
      connection.identity,
      permission
    );
    return false;
  }

  logger.debug(
    'Connection: check permission successfull',
    connection.identity,
    permission
  );
  return true;
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;

exports.verifyConnectionToken = verifyConnectionToken;
exports.checkConnectionPermission = checkConnectionPermission;
