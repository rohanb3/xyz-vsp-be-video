const axios = require('axios');

const { IDENTITY_API_URL, STATIC_TOKEN } = require('@/constants/identityApi');

async function getCompanyIdByUserId(identity) {
  return axios
    .get(`${IDENTITY_API_URL}/users/${STATIC_TOKEN}/trusted/${identity}`)
    .then(response => response.data.companyId);
}

exports.getCompanyIdByUserId = getCompanyIdByUserId;
