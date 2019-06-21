const callsDBClient = require('@/services/calls/DBClient');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const { connectionsHeap } = require('@/services/connectionsHeap');
const { lazyLoadedData, lazyLoadDefault } = require('@/models/dto/utils');
const callDetailDTO = require('@/models/dto/call/callDetailDTO');
const callSalesRepDTO = require('@/models/dto/call/callSalesRepDTO');
const { getDifferenceFromTo, formatTimeToFilter } = require('@/services/time');
const logger = require('@/services/logger')(module);

function getCallsLazy(query) {
  const { from, to, offset, limit, ...filter } = query;

  const lazyLoad = {
    offset: offset || lazyLoadDefault.offset,
    limit: limit || lazyLoadDefault.limit,
  };

  const sort = {
    acceptedAt: -1,
  };

  const dateRange = {
    from: formatTimeToFilter(from),
    to: formatTimeToFilter(to),
  };

  const getDataPromise = callsDBClient
    .getFilteredBy(filter, dateRange, sort, lazyLoad)
    .then(data => data.map(convertCallToResponseFormat));

  const getCountPromise = callsDBClient.getCountFilteredBy(filter, dateRange);

  return Promise.all([getDataPromise, getCountPromise]).then(([data, count]) =>
    lazyLoadedData(data, count, lazyLoad)
  );
}

function getActiveCall(operatorId) {
  logger.info('Get active call for operator: ', operatorId);
  return connectionsHeap
    .get(operatorId)
    .then(data => {
      logger.info('Operator connection data found: ', data);
      return data ? data.activeCallId : Promise.reject();
    })
    .then(callId => activeCallsHeap.get(callId))
    .then(call => {
      logger.info('Operator active call found: ', call);
      return call ? callSalesRepDTO(call) : null;
    });
}

function convertCallToResponseFormat(call) {
  const duration = calculateCallLength(call);
  return callDetailDTO(call, duration);
}

function calculateCallLength(call) {
  const { callbacks, acceptedAt, finishedAt } = call;
  const mainCallDuration = getDifferenceFromTo(acceptedAt, finishedAt);

  return callbacks.reduce(
    (duration, callback) =>
      duration + getDifferenceFromTo(callback.acceptedAt, callback.finishedAt),
    mainCallDuration
  );
}

exports.getCallsLazy = getCallsLazy;
exports.getActiveCall = getActiveCall;
exports.calculateCallLength = calculateCallLength;
