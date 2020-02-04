const twilio = require('@/services/twilio');
const logger = require('@/services/logger')(module);
const publicApi = require('@/services/httpServices/publicApiRequests');
const identityApi = require('@/services/httpServices/identityApiRequests');

const { connectionsHeap } = require('@/services/connectionsHeap');
const { TOKEN_INVALID, UNAUTHORIZED } = require('@/constants/connection');

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
    disconnectCallBack(
      !oldSocket.activeCallId ? oldSocket.socketId : socket.id
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
    // TODO: should be removed after Identity support of new permissions
    _mockPermissions(socket.permissions);
  } catch (e) {
    logger.debug('Operator: authentification error', e);
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
      // TODO: should be removed after Identity support of new permissions
      _mockPermissions(connection.permissions);

      logger.debug('Connection: token is correct', connection.identity);
    } catch (e) {
      logger.debug('Connection: invalid token', connection.identity);
      return false;
    }
  } else {
    logger.debug('Connection: token was verified less than 1 minute ago', connection.identity);
  }

  return true;
}

function checkConnectionPermission(connection, permission) {
  logger.debug('Connection: check permission', connection.identity, permission);

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

function _mockPermissions(permissions) {
  // permissions.push('xyzies.vsp.call.answer');
  // permissions.push('xyzies.vsp.realtimedashboard.subscribe');
  permissions.push('xyzies.vsp.realtimedashboard.choosetenant');
}

exports.authenticateOperator = authenticateOperator;
exports.authenticateCustomer = authenticateCustomer;

exports.verifyConnectionToken = verifyConnectionToken;
exports.checkConnectionPermission = checkConnectionPermission;
