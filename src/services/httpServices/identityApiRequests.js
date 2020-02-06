const axios = require('axios');
const { IDENTITY_API_URL, STATIC_TOKEN } = require('@/constants/identityApi');

const { TOKEN_INVALID, FORBIDDEN } = require('@/constants/connection');

const api = axios.create({
  baseURL: IDENTITY_API_URL,
});

function getCompanyIdByUserId(identity) {
  return api
    .get(`users/${STATIC_TOKEN}/trusted/${identity}`)
    .then(response => response.data.companyId);
}

async function getUserProfile(token) {
  if (!token) {
    throw new Error('Token is required');
  }

  const response = await api.get('users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

function checkTokenValidity(token) {
  if (!token) {
    return Promise.resolve(false);
  }

  return getUserProfile(token)
    .then(() => true)
    .catch(() => false);
}

async function checkUserScope(Authorization, role, scope) {
  try {
    await api.head('role', {
      headers: { Authorization },
      params: { role, scope },
    });

    return true;
  } catch (e) {
    if (e.response.status === 403) {
      throw FORBIDDEN;
    } else if (e.response.status === 401) {
      throw TOKEN_INVALID;
    } else {
      throw e;
    }
  }
}

exports.checkUserScope = checkUserScope;
exports.getUserProfile = getUserProfile;
exports.checkTokenValidity = checkTokenValidity;
exports.getCompanyIdByUserId = getCompanyIdByUserId;

exports._api = api;
