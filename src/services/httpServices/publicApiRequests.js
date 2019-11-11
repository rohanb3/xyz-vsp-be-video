const requestGetBuild = require('./httpGet');

const { PUBLIC_API_URL, STATIC_TOKEN } = require('@/constants/publicApi');

function getServiceProviderByCompanyId(companyId){
    let options = {
        host: PUBLIC_API_URL,
        path: '/serviceProvider/'+ {STATIC_TOKEN} +'/trusted'+{companyId},
        port: 443,
        method: 'GET'
    };

    return requestGetBuild.getRequestSend(options);
}

exports.getServiceProviderByCompanyId = getServiceProviderByCompanyId;