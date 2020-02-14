const utils = require('@/services/utils');
const callsDBClient = require('@/services/calls/DBClient');
const UndefinedDuration = require('@/models/aggregations/durations');

const prepareFromToFilter = (from, to) => {
  const filterObj = utils.removeUndefined({
    $gte: from,
    $lt: to,
  });

  return Object.getOwnPropertyNames(filterObj).length ? filterObj : undefined;
};

const prepareMatchForAggregationDurations = ({
  tenantId,
  callType,
  callStatus,
  from,
  to,
}) => {
  const match = {
    tenantId,
    callType,
    callStatus,
    requestedAt: prepareFromToFilter(from, to),
  };

  return utils.removeUndefined(match);
};

const aggregateDurations = filter =>
  callsDBClient
    .aggregate([
      {
        $match: prepareMatchForAggregationDurations(filter),
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          maxCallDuration: { $max: '$callDuration' },
          averageCallDuration: { $avg: '$callDuration' },
          totalCallDuration: { $sum: '$callDuration' },
          maxWaitingDuration: { $max: '$waitingDuration' },
          averageWaitingDuration: { $avg: '$waitingDuration' },
          totalWaitingDuration: { $sum: '$waitingDuration' },
        },
      },
    ])
    .then(([data = UndefinedDuration]) => data);

const getAggregatedDurations = ({ tenantId, from, to, callType, callStatus }) =>
  aggregateDurations({
    to,
    from,
    callType,
    tenantId,
    callStatus,
  });

exports.getAggregatedDurations = getAggregatedDurations;
