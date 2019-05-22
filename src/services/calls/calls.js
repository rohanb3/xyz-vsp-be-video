const callsDBClient = require('@/services/calls/DBClient');
const { lazyLoadedData, lazyLoadDefault } = require('@/models/dto/utils');
const callDetailDTO = require('@/models/dto/call/callDetailDTO');
const { getDifferenceFromTo, formatTimeToFilter } = require('@/services/time');

function getCallsLazy(filter, range, offset, limit) {
  const lazyLoad = {
    offset: offset || lazyLoadDefault.offset,
    limit: limit || lazyLoadDefault.limit,
  };

  const rangeFilter = {
    from: formatTimeToFilter(range.from),
    to: formatTimeToFilter(range.to),
  };

  const getDataPromise = callsDBClient
    .getFilteredBy(filter, rangeFilter, lazyLoad)
    .then(data => data.map(convertCallToResponseFormat));

  const getCountPromise = callsDBClient.getCountFilteredBy(filter, rangeFilter);

  return Promise.all([getDataPromise, getCountPromise]).then(([data, count]) =>
    lazyLoadedData(data, count, lazyLoad)
  );
}

async function getActiveCall(operatorId) {
  const calls = await callsDBClient.getFilteredBy({
    acceptedBy: operatorId,
    finishedAt: { $eq: undefined },
  });

  const isActiveCallExist = calls.length;

  if (isActiveCallExist) {
    const [call] = calls;
    return call;
  }

  return Promise.reject();
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
