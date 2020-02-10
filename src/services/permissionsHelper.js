const identityApi = require('@/services/httpServices/identityApiRequests');

const isPermissionGranted = async (token, role, permission) => {
  try {
    await identityApi.checkUserScope(token, role, permission);
    return true;
  } catch {
    return false;
  }
};

exports.isPermissionGranted = isPermissionGranted;
