const axios = require('axios');
const { IDENTITY_API_URL, STATIC_TOKEN } = require('@/constants/identityApi');

const api = axios.create({
  baseURL: IDENTITY_API_URL,
});

function getCompanyIdByUserId(identity) {
  return api
    .get(`users/${STATIC_TOKEN}/trusted/${identity}`)
    .then(response => response.data.companyId);
}

function checkTokenValidity(token) {
  return api
    .get('users/profile', { headers: { Authorization: `Bearer ${token}` } })
    .then(() => true)
    .catch(() => false);
}

exports.getCompanyIdByUserId = getCompanyIdByUserId;
exports.checkTokenValidity = checkTokenValidity;
