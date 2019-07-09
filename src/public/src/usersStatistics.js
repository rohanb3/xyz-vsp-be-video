/* eslint-disable no-console */
const moment = require('moment');
const { TYPES, FIELDS } = require('./constants');
const {
  getDefaultCall,
  getField,
  setField,
  incrementField,
  decrementField,
} = require('./utils');
const {
  getStatisticsFieldDrawer,
  drawCustomerStatisticsField,
  drawOperatorStatisticsField,
  drawCall,
} = require('./statisticsDrawers');

let pendingCallsIds = [];
let activeCallsIds = [];
let finishedCallsIds = [];
let missedCallsIds = [];

let totalEnqueueingTime = 0;
let totalAcceptingTime = 0;
let totalDuration = 0;

let totalCallsForTest = 0;
let onAllCallsPerformed = () => {};

module.exports = {
  init,
  incrementConnectingUsers,
  decrementConnectingUsers,
  incrementConnectedUsers,
  decrementConnectedUsers,
  incrementAuthorizingUsers,
  decrementAuthorizingUsers,
  incrementAuthenticatedUsers,
  incrementUnauthorizedUsers,
  incrementWaitingForQueueCalls,
  decrementWaitingForQueueCalls,
  incrementNotEnqueuedCalls,
  incrementPendingCalls,
  decrementPendingCalls,
  incrementActiveCalls,
  decrementActiveCalls,
  incrementFinishedCalls,
  incrementMissedCalls,
  incrementOperatorsAcceptedCalls,
  onUserConnected,
  onUserAuthorized,
  onCallEnqueued,
  onCallAcceptionByOperatorHandled,
  onCustomerCallAccepted,
  updateCallDurationTime,
};

function init(totalCalls = 0, allCallsPerformedHandler = () => {}) {
  totalCallsForTest = totalCalls;
  onAllCallsPerformed = allCallsPerformedHandler;
}

function incrementConnectingUsers(userType, statistics) {
  incrementField(statistics, userType, FIELDS.CONNECTING);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTING, statistics);
}

function decrementConnectingUsers(userType, statistics) {
  decrementField(statistics, userType, FIELDS.CONNECTING);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTING, statistics);
}

function incrementConnectedUsers(userType, statistics) {
  incrementField(statistics, userType, FIELDS.CONNECTED);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTED, statistics);
}

function decrementConnectedUsers(userType, statistics) {
  decrementField(statistics, userType, FIELDS.CONNECTED);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTED, statistics);
}

function incrementAuthorizingUsers(userType, statistics) {
  incrementField(statistics, userType, FIELDS.AUTHORIZING);
  getStatisticsFieldDrawer(userType)(FIELDS.AUTHORIZING, statistics);
}

function decrementAuthorizingUsers(userType, statistics) {
  decrementField(statistics, userType, FIELDS.AUTHORIZING);
  getStatisticsFieldDrawer(userType)(FIELDS.AUTHORIZING, statistics);
}

function incrementAuthenticatedUsers(userType, statistics) {
  incrementField(statistics, userType, FIELDS.AUTHENTICATED);
  getStatisticsFieldDrawer(userType)(FIELDS.AUTHENTICATED, statistics);
}

function incrementUnauthorizedUsers(userType, statistics) {
  incrementField(statistics, userType, FIELDS.UNAUTHORIZED);
  getStatisticsFieldDrawer(userType)(FIELDS.UNAUTHORIZED, statistics);
}

function incrementWaitingForQueueCalls(userType, statistics) {
  incrementField(statistics, userType, FIELDS.WAITING_FOR_QUEUE_CALLS);
  getStatisticsFieldDrawer(userType)(
    FIELDS.WAITING_FOR_QUEUE_CALLS,
    statistics
  );
}

function decrementWaitingForQueueCalls(userType, statistics) {
  decrementField(statistics, userType, FIELDS.WAITING_FOR_QUEUE_CALLS);
  getStatisticsFieldDrawer(userType)(
    FIELDS.WAITING_FOR_QUEUE_CALLS,
    statistics
  );
}

function incrementNotEnqueuedCalls(userType, statistics) {
  incrementField(statistics, userType, FIELDS.NOT_ENQUEUED_CALLS);
  getStatisticsFieldDrawer(userType)(FIELDS.NOT_ENQUEUED_CALLS, statistics);
}

function incrementPendingCalls(userType, callId, statistics) {
  if (callId && !pendingCallsIds.includes(callId)) {
    pendingCallsIds.push(callId);
    incrementField(statistics, userType, FIELDS.PENDING_CALLS);
    checkAndAddCall(callId, statistics);
    getStatisticsFieldDrawer(userType)(FIELDS.PENDING_CALLS, statistics);
  }
}

function decrementPendingCalls(userType, callId, statistics) {
  if (callId && pendingCallsIds.includes(callId)) {
    pendingCallsIds = pendingCallsIds.filter(id => id !== callId);
    decrementField(statistics, userType, FIELDS.PENDING_CALLS);
    getStatisticsFieldDrawer(userType)(FIELDS.PENDING_CALLS, statistics);
  }
}

function incrementActiveCalls(userType, callId, statistics) {
  if (callId && !activeCallsIds.includes(callId)) {
    activeCallsIds.push(callId);
    incrementField(statistics, userType, FIELDS.ACTIVE_CALLS);
    getStatisticsFieldDrawer(userType)(FIELDS.ACTIVE_CALLS, statistics);
  }

  const currentActiveCalls = getField(
    statistics,
    userType,
    FIELDS.ACTIVE_CALLS
  );
  const maxActiveCalls = getField(
    statistics,
    userType,
    FIELDS.MAX_ACTIVE_CALLS
  );

  if (currentActiveCalls > maxActiveCalls) {
    setField(statistics, userType, FIELDS.MAX_ACTIVE_CALLS, currentActiveCalls);
    getStatisticsFieldDrawer(userType)(FIELDS.MAX_ACTIVE_CALLS, statistics);
  }
}

function decrementActiveCalls(userType, callId, statistics) {
  if (activeCallsIds.includes(callId)) {
    activeCallsIds = activeCallsIds.filter(id => id !== callId);
    decrementField(statistics, userType, FIELDS.ACTIVE_CALLS);
    getStatisticsFieldDrawer(userType)(FIELDS.ACTIVE_CALLS, statistics);
  }
}

function incrementFinishedCalls(userType, callId, statistics) {
  if (callId && !finishedCallsIds.includes(callId)) {
    finishedCallsIds.push(callId);
    incrementField(statistics, userType, FIELDS.FINISHED_CALLS);
    incrementTotalCalls(userType, statistics);
    getStatisticsFieldDrawer(userType)(FIELDS.FINISHED_CALLS, statistics);
  }
}

function incrementMissedCalls(userType, callId, statistics) {
  if (callId && !missedCallsIds.includes(callId)) {
    missedCallsIds.push(callId);
    incrementField(statistics, userType, FIELDS.MISSED_CALLS);
    incrementTotalCalls(userType, statistics);
    getStatisticsFieldDrawer(userType)(FIELDS.MISSED_CALLS, statistics);
  }
}

function incrementOperatorsAcceptedCalls(statistics) {
  incrementTotalCalls(TYPES.OPERATORS, statistics);
}

function onUserConnected(userType, requestTime, responseTime, statistics) {
  const value = responseTime - requestTime;
  const totalConnectingTime =
    getField(statistics, userType, FIELDS.TOTAL_CONNECTING_TIME) + value;
  const totalUsers = getField(statistics, userType, FIELDS.CONNECTED);

  if (checkMinConnectingTime(userType, value, statistics)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MIN_CONNECTING_TIME, statistics);
  }

  if (checkMaxConnectingTime(userType, value, statistics)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MAX_CONNECTING_TIME, statistics);
  }

  const average = totalUsers
    ? (Number(totalConnectingTime) / totalUsers).toFixed(3)
    : 0;

  setField(
    statistics,
    userType,
    FIELDS.TOTAL_CONNECTING_TIME,
    totalConnectingTime
  );
  setField(statistics, userType, FIELDS.AVERAGE_CONNECTING_TIME, average);
  getStatisticsFieldDrawer(userType)(
    FIELDS.AVERAGE_CONNECTING_TIME,
    statistics
  );
}

function onUserAuthorized(userType, requestTime, responseTime, statistics) {
  const value = responseTime - requestTime;
  const totalAuthorizingTime =
    getField(statistics, userType, FIELDS.TOTAL_AUTHORIZING_TIME) + value;
  const totalUsers = getField(statistics, userType, FIELDS.AUTHENTICATED);

  if (checkMinAuthorizingTime(userType, value, statistics)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MIN_AUTHORIZING_TIME, statistics);
  }

  if (checkMaxAuthorizingTime(userType, value, statistics)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MAX_AUTHORIZING_TIME, statistics);
  }

  const average = totalUsers
    ? (Number(totalAuthorizingTime) / totalUsers).toFixed(3)
    : 0;

  setField(
    statistics,
    userType,
    FIELDS.TOTAL_AUTHORIZING_TIME,
    totalAuthorizingTime
  );
  setField(statistics, userType, FIELDS.AVERAGE_AUTHORIZING_TIME, average);
  getStatisticsFieldDrawer(userType)(
    FIELDS.AVERAGE_AUTHORIZING_TIME,
    statistics
  );
}

function onCallEnqueued(id, requestTime, responseTime, statistics) {
  const value = responseTime - requestTime;

  if (checkMinEnqueueingTime(value, statistics)) {
    drawCustomerStatisticsField(FIELDS.MIN_ENQUEUEING_TIME, statistics);
  }

  if (checkMaxEnqueueingTime(value, statistics)) {
    drawCustomerStatisticsField(FIELDS.MAX_ENQUEUEING_TIME, statistics);
  }

  updateAndDrawCall(
    id,
    {
      [FIELDS.REQUESTED_AT]: moment(requestTime * 1000).format('HH:mm:ss'),
      [FIELDS.ENQUEUED_AT]: moment(responseTime * 1000).format('HH:mm:ss'),
      [FIELDS.ENQUEUED_IN]: value.toFixed(3),
    },
    statistics
  );

  totalEnqueueingTime += value;

  const totalCalls = getField(statistics, TYPES.CUSTOMERS, FIELDS.TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalEnqueueingTime) / totalCalls).toFixed(2)
    : 0;
  setField(
    statistics,
    TYPES.CUSTOMERS,
    FIELDS.AVERAGE_ENQUEUEING_TIME,
    average
  );
  drawCustomerStatisticsField(FIELDS.AVERAGE_ENQUEUEING_TIME, statistics);
}

function onCallAcceptionByOperatorHandled(
  id,
  requestTime,
  responseTime,
  statistics
) {
  const value = responseTime - requestTime;

  if (checkMinAcceptingTime(value, statistics)) {
    drawOperatorStatisticsField(FIELDS.MIN_ACCEPTING_TIME, statistics);
  }

  if (checkMaxAcceptingTime(value, statistics)) {
    drawOperatorStatisticsField(FIELDS.MAX_ACCEPTING_TIME, statistics);
  }

  if (id) {
    const updates = {
      [FIELDS.ACCEPTED_AT]: moment(requestTime * 1000).format('HH:mm:ss'),
      [FIELDS.ACCEPTED_AT_RAW]: requestTime,
      [FIELDS.READY_FOR_OPERATOR_AT]: moment(responseTime * 1000).format(
        'HH:mm:ss'
      ),
      [FIELDS.WRAPPING_UP_OPERATOR]: value.toFixed(3),
    };

    let call = getField(statistics, TYPES.CALLS, id);

    if (!call) {
      call = checkAndAddCall(id, statistics);
    }

    const readyForCustomerAt = call[FIELDS.READY_FOR_CUSTOMER_AT_RAW];

    if (readyForCustomerAt) {
      updates[FIELDS.WRAPPING_UP_CUSTOMER] = (
        readyForCustomerAt - requestTime
      ).toFixed(3);
    }

    updateAndDrawCall(id, updates, statistics);
  }

  totalAcceptingTime += value;

  const totalCalls = getField(statistics, TYPES.OPERATORS, FIELDS.TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalAcceptingTime) / totalCalls).toFixed(2)
    : 0;
  setField(statistics, TYPES.OPERATORS, FIELDS.AVERAGE_ACCEPTING_TIME, average);
  drawOperatorStatisticsField(FIELDS.AVERAGE_ACCEPTING_TIME, statistics);
}

function onCustomerCallAccepted(id, requestTime, responseTime, statistics) {
  if (id) {
    let call = getField(statistics, TYPES.CALLS, id);

    if (!call) {
      call = checkAndAddCall(id, statistics);
    }

    const acceptedAt = call[FIELDS.ACCEPTED_AT_RAW];
    const updates = {
      [FIELDS.READY_FOR_CUSTOMER_AT]: moment(responseTime * 1000).format(
        'HH:mm:ss'
      ),
      [FIELDS.READY_FOR_CUSTOMER_AT_RAW]: responseTime,
    };
    if (acceptedAt) {
      updates[FIELDS.WRAPPING_UP_CUSTOMER] = (
        responseTime - acceptedAt
      ).toFixed(3);
    }
    updateAndDrawCall(id, updates, statistics);
  }
}

function updateCallDurationTime(value = 0, statistics) {
  if (checkMinCallDuration(value, statistics)) {
    drawCustomerStatisticsField(FIELDS.MIN_DURATION, statistics);
  }

  if (checkMaxCallDuration(value, statistics)) {
    drawCustomerStatisticsField(FIELDS.MAX_DURATION, statistics);
  }

  totalDuration += value;

  const totalCalls = getField(statistics, TYPES.CUSTOMERS, FIELDS.TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalDuration) / totalCalls).toFixed(2)
    : 0;
  setField(statistics, TYPES.CUSTOMERS, FIELDS.AVERAGE_DURATION, average);
  setField(
    statistics,
    TYPES.CUSTOMERS,
    FIELDS.TOTAL_DURATION,
    totalDuration.toFixed(2)
  );
  drawCustomerStatisticsField(FIELDS.AVERAGE_DURATION, statistics);
  drawCustomerStatisticsField(FIELDS.TOTAL_DURATION, statistics);
}

function incrementTotalCalls(userType, statistics) {
  incrementField(statistics, userType, FIELDS.TOTAL_CALLS);
  getStatisticsFieldDrawer(userType)(FIELDS.TOTAL_CALLS, statistics);
  const totalCalls = getField(statistics, TYPES.CUSTOMERS, FIELDS.TOTAL_CALLS);
  if (totalCalls === totalCallsForTest) {
    onAllCallsPerformed();
    setTimeout(() => {
      console.log('pendingCallsIds', pendingCallsIds.length);
      console.log('activeCallsIds', activeCallsIds.length);
      console.log('finishedCallsIds', finishedCallsIds.length);
      console.log('missedCallsIds', missedCallsIds.length);
    }, 15000);
  }
}

function checkMinEnqueueingTime(value = 0, statistics) {
  const minEnqueueingTime = parseFloat(
    getField(statistics, TYPES.CUSTOMERS, FIELDS.MIN_ENQUEUEING_TIME)
  );
  if (value < minEnqueueingTime) {
    setField(
      statistics,
      TYPES.CUSTOMERS,
      FIELDS.MIN_ENQUEUEING_TIME,
      value.toFixed(2)
    );
    return true;
  }
  return false;
}

function checkMaxEnqueueingTime(value = 0, statistics) {
  const maxEnqueueingTime = parseFloat(
    getField(statistics, TYPES.CUSTOMERS, FIELDS.MAX_ENQUEUEING_TIME)
  );
  if (value > maxEnqueueingTime) {
    setField(
      statistics,
      TYPES.CUSTOMERS,
      FIELDS.MAX_ENQUEUEING_TIME,
      value.toFixed(2)
    );
    return true;
  }
  return false;
}

function checkMinAcceptingTime(value = 0, statistics) {
  const minAcceptingTime = parseFloat(
    getField(statistics, TYPES.OPERATORS, FIELDS.MIN_ACCEPTING_TIME)
  );
  if (value < minAcceptingTime) {
    setField(
      statistics,
      TYPES.OPERATORS,
      FIELDS.MIN_ACCEPTING_TIME,
      value.toFixed(2)
    );
    return true;
  }
  return false;
}

function checkMaxAcceptingTime(value = 0, statistics) {
  const maxAcceptingTime = parseFloat(
    getField(statistics, TYPES.OPERATORS, FIELDS.MAX_ACCEPTING_TIME)
  );
  if (value > maxAcceptingTime) {
    setField(
      statistics,
      TYPES.OPERATORS,
      FIELDS.MAX_ACCEPTING_TIME,
      value.toFixed(2)
    );
    return true;
  }
  return false;
}

function checkMinCallDuration(value = 0, statistics) {
  const minDuration = parseFloat(
    getField(statistics, TYPES.CUSTOMERS, FIELDS.MIN_DURATION)
  );
  if (value < minDuration) {
    setField(
      statistics,
      TYPES.CUSTOMERS,
      FIELDS.MIN_DURATION,
      value.toFixed(2)
    );
    return true;
  }
  return false;
}

function checkMaxCallDuration(value = 0, statistics) {
  const maxDuration = parseFloat(
    getField(statistics, TYPES.CUSTOMERS, FIELDS.MAX_DURATION)
  );
  if (value > maxDuration) {
    setField(
      statistics,
      TYPES.CUSTOMERS,
      FIELDS.MAX_DURATION,
      value.toFixed(2)
    );
    return true;
  }
  return false;
}

function checkMinConnectingTime(userType, value, statistics) {
  const minConnectingTime = parseFloat(
    getField(statistics, userType, FIELDS.MIN_CONNECTING_TIME)
  );
  if (value < minConnectingTime) {
    setField(
      statistics,
      userType,
      FIELDS.MIN_CONNECTING_TIME,
      value.toFixed(3)
    );
    return true;
  }
  return false;
}

function checkMaxConnectingTime(userType, value, statistics) {
  const maxConnectingTime = parseFloat(
    getField(statistics, userType, FIELDS.MAX_CONNECTING_TIME)
  );
  if (value > maxConnectingTime) {
    setField(
      statistics,
      userType,
      FIELDS.MAX_CONNECTING_TIME,
      value.toFixed(3)
    );
    return true;
  }
  return false;
}

function checkMinAuthorizingTime(userType, value, statistics) {
  const minAuthorizingTime = parseFloat(
    getField(statistics, userType, FIELDS.MIN_AUTHORIZING_TIME)
  );

  if (value < minAuthorizingTime) {
    setField(
      statistics,
      userType,
      FIELDS.MIN_AUTHORIZING_TIME,
      value.toFixed(3)
    );
    return true;
  }
  return false;
}

function checkMaxAuthorizingTime(userType, value, statistics) {
  const maxAuthorizingTime = parseFloat(
    getField(statistics, userType, FIELDS.MAX_AUTHORIZING_TIME)
  );

  if (value > maxAuthorizingTime) {
    setField(
      statistics,
      userType,
      FIELDS.MAX_AUTHORIZING_TIME,
      value.toFixed(3)
    );
    return true;
  }
  return false;
}

function checkAndAddCall(id, statistics) {
  if (id && !isCallInList(id, statistics)) {
    const defaultCall = addCallToList(id, statistics);
    drawCall(id, null);
    return defaultCall;
  }
  return null;
}

function isCallInList(id, statistics) {
  return Boolean(statistics[TYPES.CALLS][id]);
}

function addCallToList(id, statistics) {
  const defaultCall = getDefaultCall();
  statistics[TYPES.CALLS][id] = defaultCall;
  return defaultCall;
}

function updateAndDrawCall(id, updates, statistics) {
  const updatedCall = { ...statistics[TYPES.CALLS][id], ...updates };
  statistics[TYPES.CALLS][id] = updatedCall;
  drawCall(id, updates);
}
