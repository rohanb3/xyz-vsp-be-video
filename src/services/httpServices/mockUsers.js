const config = require('config');
const logger = require('@/services/logger')(module);

const {
  token: deviceMockedToken,
  companyId: deviceMockedCompanyId,
} = config.get('mockedUsers.device');

const {
  token: operatorMockedToken,
  companyId: operatorMockedCompanyId,
} = config.get('mockedUsers.operator');

async function getMockedUserProfile(token) {
  if (
    deviceMockedToken &&
    deviceMockedCompanyId &&
    deviceMockedToken === token
  ) {
    logger.debug(
      'Mocked Device Token detected. CompanyId:',
      deviceMockedCompanyId
    );

    return {
      role: 'SuperAdmin',
      companyId: deviceMockedCompanyId,
      scopes: [
        'xyzies.identity.user.read.incompany',
        'xyzies.authorization.reviews.admin',
        'xyzies.authorization.vsp.mobile',
        'xyzies.authorization.reviews.mobile',
      ],
    };
  }

  if (
    operatorMockedToken &&
    operatorMockedCompanyId &&
    operatorMockedToken === token
  ) {
    logger.debug(
      'Mocked Operator Token detected. CompanyId:',
      operatorMockedCompanyId
    );

    return {
      role: 'SupportAdmin',
      companyId: operatorMockedCompanyId,
      scopes: [
        'xyzies.identity.user.read.incompany',
        'xyzies.vsp.call.answer',
        'xyzies.authorization.vsp.web',
      ],
    };
  }

  return null;
}

exports.getMockedUserProfile = getMockedUserProfile;
