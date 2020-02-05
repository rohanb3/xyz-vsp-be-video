const callsDBClient = require('@/services/calls/DBClient');

const getAggregatedDurations = ({ tenantId, from, to, callType, callStatus }) =>
  callsDBClient.aggregateDurations({
    to,
    from,
    callType,
    tenantId,
    callStatus,
  });

exports.getAggregatedDurations = getAggregatedDurations;
