const axios = require('axios');

const { IDENTITY_API_URL, STATIC_TOKEN } = require('@/constants/identityApi');

async function getCompanyByUserId(identity) {
  return axios
    .get(
      `https://${IDENTITY_API_URL}/api/users/${STATIC_TOKEN}/trusted/${identity}`
    )
    .then(response => response.data.companyId)
    .catch(e => {
      throw e;
      //console.log('err', e);
    });
}

exports.getCompanyByUserId = getCompanyByUserId;
