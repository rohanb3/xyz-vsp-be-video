const axios = require('axios');

const { PUBLIC_API_URL, STATIC_TOKEN } = require('@/constants/publicApi');

async function getTenantByCompanyId(companyId) {
  return axios
    .get(
      `${PUBLIC_API_URL}/tenant/trusted/${STATIC_TOKEN}/single/${companyId}/by-company/`
    )
    .then(response => response.data.name);
}

exports.getTenantByCompanyId = getTenantByCompanyId;
