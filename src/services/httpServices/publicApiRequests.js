const axios = require('axios');

const { PUBLIC_API_URL, STATIC_TOKEN } = require('@/constants/publicApi');

async function getServiceProviderByCompanyId(companyId) {
  return axios
    .get(
      `https://${PUBLIC_API_URL}/tenant/trusted/${STATIC_TOKEN}/single/${companyId}/by-company/`
    )
    .then(response => response.data.name)
    .catch(e => {
      throw e;
      //console.log('err', e);
    });
}

exports.getServiceProviderByCompanyId = getServiceProviderByCompanyId;
