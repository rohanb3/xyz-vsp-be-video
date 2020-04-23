const utils = require('@/services/utils');
const callsDBClient = require('@/services/calls/DBClient');
const UndefinedDuration = require('@/models/aggregations/durations');
const UndefinedCallbacks = require('@/models/aggregations/callbacks');
const { callTypes, callbackStatuses } = require('@/constants/calls');

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

const prepareMatchForAggregationCallbacks = ({ from, to, tenantId }) => {
  const match = {
    tenantId,
    callType: callTypes.VIDEO,
    callbacksCount: { $gte: 1 },
    requestedAt: prepareFromToFilter(from, to),
  };

  return utils.removeUndefined(match);
};

const conditionByCallbackType = {
  [callbackStatuses.ANSWERED]: {
    $ne: [{ $ifNull: ['$$callback.acceptedAt', true] }, true],
  },
  [callbackStatuses.MISSED]: {
    $ne: [{ $ifNull: ['$$callback.declinedAt', true] }, true],
  },
};

const filterCallbacks = type => ({
  $filter: {
    input: '$callbacks',
    as: 'callback',
    cond: conditionByCallbackType[type],
  },
});

const getAggregatedDurations = ({ tenantId, from, to, callType, callStatus }) =>
  callsDBClient
    .aggregate([
      {
        $match: prepareMatchForAggregationDurations({
          tenantId,
          from,
          to,
          callType,
          callStatus,
        }),
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

const getAggregatedCallbacks = ({ tenantId, from, to }) => {
  const $addFields = { callbacksCount: { $size: '$callbacks' } };
  const $match = prepareMatchForAggregationCallbacks({ tenantId, from, to });
  const $group = {
    _id: null,
    total: { $sum: { $size: '$callbacks' } },
    missed: { $sum: { $size: filterCallbacks(callbackStatuses.MISSED) } },
    answered: { $sum: { $size: filterCallbacks(callbackStatuses.ANSWERED) } },
  };

  return callsDBClient
    .aggregate([{ $addFields }, { $match }, { $group }])
    .then(([data = UndefinedCallbacks]) => data);
};

exports.getAggregatedDurations = getAggregatedDurations;
exports.getAggregatedCallbacks = getAggregatedCallbacks;
