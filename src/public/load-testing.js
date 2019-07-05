/* eslint-disable no-console */
const io = require('socket.io-client');
const moment = require('moment');

const { SOCKET_EVENTS, TYPES, FIELDS } = require('./src/constants');
const { getDefaultStatistics, getDefaultCall } = require('./src/utils');
const {
  drawCustomersFrames,
  drawOperatorsFrames,
} = require('./src/userDrawers');
const {
  drawStatisitics,
  getStatisticsFieldDrawer,
  drawQueueStatisticsField,
  drawCustomerStatisticsField,
  drawOperatorStatisticsField,
  drawCall,
} = require('./src/statisticsDrawers');

const isLocal = typeof window.prompt('Is local?') === 'string';
const now = Date.now();
const socketUrl = '/operators';
const socketOptions = { transports: ['websocket'] };

if (!isLocal) {
  socketOptions.path = '/api/video/socket.io';
}

const identity = `${now}-operator-0`;
const socket = io(socketUrl, socketOptions);

let isStarted = false;
let callsStatisticsOpened = false;

let statistics = getDefaultStatistics();

const statisticsCallbacks = {
  onUserConnected,
  onUserAuthorized,
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
  onCallEnqueued,
  onCallAcceptionByOperatorHandled,
  onCustomerCallAccepted,
  updateCallDurationTime,
  incrementOperatorsAcceptedCalls,
};

let minEnqueueingTime = Infinity;
let maxEnqueueingTime = 0;
let totalEnqueueingTime = 0;
let minAcceptingTime = Infinity;
let maxAcceptingTime = 0;
let totalAcceptingTime = 0;
let minDuration = Infinity;
let maxDuration = 0;
let totalDuration = 0;

let totalCallsForTest = 0;

window.statisticsCallbacks = statisticsCallbacks;

subscribeToControls();

socket.on(SOCKET_EVENTS.CONNECT, () => {
  socket.emit(SOCKET_EVENTS.AUTHENTICATION, { identity });
  socket.on(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
  socket.on(SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);
});

function onAuthenticated() {
  socket.on(SOCKET_EVENTS.CALLS_CHANGED, onCallsChanged);
}

function onUnauthorized() {}

function onCallsChanged({ size = 0, peak } = {}) {
  const prevMaxInQueue = getField(TYPES.QUEUE, FIELDS.MAX_IN_QUEUE);

  setField(TYPES.QUEUE, FIELDS.PENDING_IN_QUEUE, size);
  drawQueueStatisticsField(FIELDS.PENDING_IN_QUEUE, statistics);
  if (peak && peak.requestedAt) {
    setField(TYPES.QUEUE, FIELDS.OLDEST_IN_QUEUE, peak.requestedAt);
    drawQueueStatisticsField(FIELDS.OLDEST_IN_QUEUE, statistics);
  }

  if (size > prevMaxInQueue) {
    setField(TYPES.QUEUE, FIELDS.MAX_IN_QUEUE, size);
    drawQueueStatisticsField(FIELDS.MAX_IN_QUEUE, statistics);
  }
}

function subscribeToControls() {
  document.querySelector('.start-button').addEventListener('click', startTest);
  document.querySelector('.clear-button').addEventListener('click', clearTest);
  document
    .querySelector('.all-calls-toggler')
    .addEventListener('click', toggleCalls);
}

function startTest() {
  if (!isStarted) {
    isStarted = true;
    disableActionButtons();
    preparePage();
  } else {
    window.alert('Test is running! Please, stop it before');
  }
}

function clearTest() {
  isStarted = false;
  removeUsers();
  resetStatistics();
  removeCalls();
  enableActionButtons();
}

function toggleCalls() {
  document.querySelector('.all-calls-statistics').classList.toggle('opened');
  const toggler = document.querySelector(
    '.all-calls-statistics .all-calls-toggler'
  );
  callsStatisticsOpened = !callsStatisticsOpened;
  toggler.innerHTML = callsStatisticsOpened ? '&#8250;' : '&#8249;';
}

function enableActionButtons() {
  document.querySelector('.start-button').disabled = false;
  document.querySelector('.clear-button').disabled = false;
}

function disableActionButtons() {
  document.querySelector('.start-button').disabled = true;
  document.querySelector('.clear-button').disabled = true;
}

function resetStatistics() {
  if (!isStarted) {
    statistics = getDefaultStatistics();
    drawStatisitics(statistics);
  } else {
    window.alert('Test is running! Please, stop it before');
  }
}

function preparePage() {
  const minCallDuration =
    (Number(document.querySelector('.min-call-duration').value) || 3) * 1000;
  const maxCallDuration =
    (Number(document.querySelector('.max-call-duration').value) || 5) * 1000;
  const connectionDelay =
    (Number(document.querySelector('.connection-delay').value) || 0.1) * 1000;
  const operatorsNumber =
    Number(document.querySelector('.operators-amount').value) || 50;

  prepareCustomers(
    minCallDuration,
    maxCallDuration,
    connectionDelay,
    operatorsNumber
  );
  prepareOperators(
    minCallDuration,
    maxCallDuration,
    connectionDelay,
    operatorsNumber
  );
  drawStatisitics(statistics);
}

function prepareCustomers(
  minCallDuration,
  maxCallDuration,
  connectionDelay,
  operatorsNumber
) {
  const customersNumber =
    Number(document.querySelector('.customers-amount').value) || 200;
  const callsPerCustomer =
    Number(document.querySelector('.calls-per-customer').value) || 1;
  const maxFirstCallDelay =
    (Number(document.querySelector('.max-first-call-delay').value) || 5) * 1000;

  setField(TYPES.CUSTOMERS, FIELDS.TOTAL, customersNumber);

  totalCallsForTest = customersNumber * callsPerCustomer;

  const options = {
    io,
    customersNumber,
    operatorsNumber,
    callsPerCustomer,
    minCallDuration,
    maxCallDuration,
    connectionDelay,
    maxFirstCallDelay,
    socketOptions,
    now,
  };

  drawCustomersFrames(options);
}

function prepareOperators(
  minCallDuration,
  maxCallDuration,
  connectionDelay,
  operatorsNumber
) {
  const acceptingLikelihood =
    Number(document.querySelector('.operator-accepting-likelihood').value) ||
    0.5;

  const options = {
    io,
    operatorsNumber,
    minCallDuration,
    maxCallDuration,
    connectionDelay,
    acceptingLikelihood,
    socketOptions,
    now,
  };

  setField(TYPES.OPERATORS, FIELDS.TOTAL, operatorsNumber);
  drawOperatorsFrames(options);
}

function removeUsers() {
  removeFrames('.customers-section');
  removeFrames('.operators-section');
}

function removeCalls() {
  document.querySelector('.all-calls-statistics .all-calls').innerHTML = '';
}

function removeFrames(selector) {
  const iframes = document.querySelectorAll(`${selector} iframe`);
  for (var i = 0; i < iframes.length; i++) {
    iframes[i].contentWindow.disconnectFromSocket();
    iframes[i].parentNode.removeChild(iframes[i]);
  }
}

function incrementConnectingUsers(userType) {
  incrementField(userType, FIELDS.CONNECTING);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTING, statistics);
}

function decrementConnectingUsers(userType) {
  decrementField(userType, FIELDS.CONNECTING);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTING, statistics);
}

function incrementConnectedUsers(userType) {
  incrementField(userType, FIELDS.CONNECTED);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTED, statistics);
}

function decrementConnectedUsers(userType) {
  decrementField(userType, FIELDS.CONNECTED);
  getStatisticsFieldDrawer(userType)(FIELDS.CONNECTED, statistics);
}

function incrementAuthorizingUsers(userType) {
  incrementField(userType, FIELDS.AUTHORIZING);
  getStatisticsFieldDrawer(userType)(FIELDS.AUTHORIZING, statistics);
}

function decrementAuthorizingUsers(userType) {
  decrementField(userType, FIELDS.AUTHORIZING);
  getStatisticsFieldDrawer(userType)(FIELDS.AUTHORIZING, statistics);
}

function incrementAuthenticatedUsers(userType) {
  incrementField(userType, FIELDS.AUTHENTICATED);
  getStatisticsFieldDrawer(userType)(FIELDS.AUTHENTICATED, statistics);
}

function incrementUnauthorizedUsers(userType) {
  incrementField(userType, FIELDS.UNAUTHORIZED);
  getStatisticsFieldDrawer(userType)(FIELDS.UNAUTHORIZED, statistics);
}

function incrementWaitingForQueueCalls(userType) {
  incrementField(userType, FIELDS.WAITING_FOR_QUEUE_CALLS);
  getStatisticsFieldDrawer(userType)(
    FIELDS.WAITING_FOR_QUEUE_CALLS,
    statistics
  );
}

function decrementWaitingForQueueCalls(userType) {
  decrementField(userType, FIELDS.WAITING_FOR_QUEUE_CALLS);
  getStatisticsFieldDrawer(userType)(
    FIELDS.WAITING_FOR_QUEUE_CALLS,
    statistics
  );
}

function incrementNotEnqueuedCalls(userType) {
  incrementField(userType, FIELDS.NOT_ENQUEUED_CALLS);
  getStatisticsFieldDrawer(userType)(FIELDS.NOT_ENQUEUED_CALLS, statistics);
}

function incrementPendingCalls(userType, id) {
  incrementField(userType, FIELDS.PENDING_CALLS);
  checkAndAddCall(id);
  getStatisticsFieldDrawer(userType)(FIELDS.PENDING_CALLS, statistics);
}

function decrementPendingCalls(userType) {
  decrementField(userType, FIELDS.PENDING_CALLS);
  getStatisticsFieldDrawer(userType)(FIELDS.PENDING_CALLS, statistics);
}

function incrementActiveCalls(userType) {
  incrementField(userType, FIELDS.ACTIVE_CALLS);
  getStatisticsFieldDrawer(userType)(FIELDS.ACTIVE_CALLS, statistics);

  const currentActiveCalls = getField(userType, FIELDS.ACTIVE_CALLS);
  const maxActiveCalls = getField(userType, FIELDS.MAX_ACTIVE_CALLS);

  if (currentActiveCalls > maxActiveCalls) {
    setField(userType, FIELDS.MAX_ACTIVE_CALLS, currentActiveCalls);
    getStatisticsFieldDrawer(userType)(FIELDS.MAX_ACTIVE_CALLS, statistics);
  }
}

function decrementActiveCalls(userType) {
  decrementField(userType, FIELDS.ACTIVE_CALLS);
  getStatisticsFieldDrawer(userType)(FIELDS.ACTIVE_CALLS, statistics);
}

function incrementFinishedCalls(userType) {
  incrementField(userType, FIELDS.FINISHED_CALLS);
  incrementTotalCalls(userType);
  getStatisticsFieldDrawer(userType)(FIELDS.FINISHED_CALLS, statistics);
}

function incrementMissedCalls(userType) {
  incrementField(userType, FIELDS.MISSED_CALLS);
  incrementTotalCalls(userType);
  getStatisticsFieldDrawer(userType)(FIELDS.MISSED_CALLS, statistics);
}

function incrementOperatorsAcceptedCalls() {
  incrementTotalCalls(TYPES.OPERATORS);
}

function onUserConnected(userType, requestTime, responseTime) {
  const value = responseTime - requestTime;
  const totalConnectingTime =
    getField(userType, FIELDS.TOTAL_CONNECTING_TIME) + value;
  const totalUsers = getField(userType, FIELDS.CONNECTED);

  if (checkMinConnectingTime(userType, value)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MIN_CONNECTING_TIME, statistics);
  }

  if (checkMaxConnectingTime(userType, value)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MAX_CONNECTING_TIME, statistics);
  }

  const average = totalUsers
    ? (Number(totalConnectingTime) / totalUsers).toFixed(3)
    : 0;

  setField(userType, FIELDS.TOTAL_CONNECTING_TIME, totalConnectingTime);
  setField(userType, FIELDS.AVERAGE_CONNECTING_TIME, average);
  getStatisticsFieldDrawer(userType)(
    FIELDS.AVERAGE_CONNECTING_TIME,
    statistics
  );
}

function onUserAuthorized(userType, requestTime, responseTime) {
  const value = responseTime - requestTime;
  const totalAuthorizingTime =
    getField(userType, FIELDS.TOTAL_AUTHORIZING_TIME) + value;
  const totalUsers = getField(userType, FIELDS.AUTHENTICATED);

  if (checkMinAuthorizingTime(userType, value)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MIN_AUTHORIZING_TIME, statistics);
  }

  if (checkMaxAuthorizingTime(userType, value)) {
    getStatisticsFieldDrawer(userType)(FIELDS.MAX_AUTHORIZING_TIME, statistics);
  }

  const average = totalUsers
    ? (Number(totalAuthorizingTime) / totalUsers).toFixed(3)
    : 0;

  setField(userType, FIELDS.TOTAL_AUTHORIZING_TIME, totalAuthorizingTime);
  setField(userType, FIELDS.AVERAGE_AUTHORIZING_TIME, average);
  getStatisticsFieldDrawer(userType)(
    FIELDS.AVERAGE_AUTHORIZING_TIME,
    statistics
  );
}

function onCallEnqueued(id, requestTime, responseTime) {
  const value = responseTime - requestTime;

  if (checkMinEnqueueingTime(value)) {
    drawCustomerStatisticsField(FIELDS.MIN_ENQUEUEING_TIME, statistics);
  }

  if (checkMaxEnqueueingTime(value)) {
    drawCustomerStatisticsField(FIELDS.MAX_ENQUEUEING_TIME, statistics);
  }

  updateAndDrawCall(id, {
    [FIELDS.REQUESTED_AT]: moment(requestTime * 1000).format('HH:mm:ss'),
    [FIELDS.ENQUEUED_AT]: moment(responseTime * 1000).format('HH:mm:ss'),
    [FIELDS.ENQUEUED_IN]: value.toFixed(3),
  });

  totalEnqueueingTime += value;

  const totalCalls = getField(TYPES.CUSTOMERS, FIELDS.TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalEnqueueingTime) / totalCalls).toFixed(2)
    : 0;
  setField(TYPES.CUSTOMERS, FIELDS.AVERAGE_ENQUEUEING_TIME, average);
  drawCustomerStatisticsField(FIELDS.AVERAGE_ENQUEUEING_TIME, statistics);
}

function onCallAcceptionByOperatorHandled(id, requestTime, responseTime) {
  const value = responseTime - requestTime;

  if (checkMinAcceptingTime(value)) {
    drawOperatorStatisticsField(FIELDS.MIN_ACCEPTING_TIME, statistics);
  }

  if (checkMaxAcceptingTime(value)) {
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

    let call = getField(TYPES.CALLS, id);

    if (!call) {
      call = checkAndAddCall(id);
    }

    const readyForCustomerAt = call[FIELDS.READY_FOR_CUSTOMER_AT_RAW];

    if (readyForCustomerAt) {
      updates[FIELDS.WRAPPING_UP_CUSTOMER] = (
        readyForCustomerAt - requestTime
      ).toFixed(3);
    }

    updateAndDrawCall(id, updates);
  }

  totalAcceptingTime += value;

  const totalCalls = getField(TYPES.OPERATORS, FIELDS.TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalAcceptingTime) / totalCalls).toFixed(2)
    : 0;
  setField(TYPES.OPERATORS, FIELDS.AVERAGE_ACCEPTING_TIME, average);
  drawOperatorStatisticsField(FIELDS.AVERAGE_ACCEPTING_TIME, statistics);
}

function onCustomerCallAccepted(id, requestTime, responseTime) {
  if (id) {
    let call = getField(TYPES.CALLS, id);

    if (!call) {
      call = checkAndAddCall(id);
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
    updateAndDrawCall(id, updates);
  }
}

function updateCallDurationTime(value = 0) {
  if (checkMinCallDuration(value)) {
    drawCustomerStatisticsField(FIELDS.MIN_DURATION, statistics);
  }

  if (checkMaxCallDuration(value)) {
    drawCustomerStatisticsField(FIELDS.MAX_DURATION, statistics);
  }

  totalDuration += value;

  const totalCalls = getField(TYPES.CUSTOMERS, FIELDS.TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalDuration) / totalCalls).toFixed(2)
    : 0;
  setField(TYPES.CUSTOMERS, FIELDS.AVERAGE_DURATION, average);
  setField(TYPES.CUSTOMERS, FIELDS.TOTAL_DURATION, totalDuration.toFixed(2));
  drawCustomerStatisticsField(FIELDS.AVERAGE_DURATION, statistics);
  drawCustomerStatisticsField(FIELDS.TOTAL_DURATION, statistics);
}

function incrementTotalCalls(userType) {
  incrementField(userType, FIELDS.TOTAL_CALLS);
  getStatisticsFieldDrawer(userType)(FIELDS.TOTAL_CALLS, statistics);
  const totalCalls = getField(TYPES.CUSTOMERS, FIELDS.TOTAL_CALLS);
  if (totalCalls === totalCallsForTest) {
    enableActionButtons();
  }
}

function incrementField(userType, field, value = 1) {
  try {
    statistics[userType][field] += value;
  } catch (e) {
    console.error(`Field ${field} cannot be incremented for ${userType}: ${e}`);
  }
}

function setField(userType, field, value) {
  try {
    statistics[userType][field] = value;
  } catch (e) {
    console.error(
      `Field ${field} cannot be set for ${userType} with ${value}: ${e}`
    );
  }
}

function getField(userType, field) {
  let value = 0;
  try {
    value = statistics[userType][field];
  } catch (e) {
    console.error(
      `Field ${field} cannot be set for ${userType} with ${value}: ${e}`
    );
    value = 0;
  }
  return value;
}

function decrementField(userType, field) {
  try {
    statistics[userType][field] -= 1;
  } catch (e) {
    console.error(`Field ${field} cannot be decremented for ${userType}: ${e}`);
  }
}

function checkMinEnqueueingTime(value = 0) {
  if (value < minEnqueueingTime) {
    minEnqueueingTime = value;
    setField(TYPES.CUSTOMERS, FIELDS.MIN_ENQUEUEING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMaxEnqueueingTime(value = 0) {
  if (value > maxEnqueueingTime) {
    maxEnqueueingTime = value;
    setField(TYPES.CUSTOMERS, FIELDS.MAX_ENQUEUEING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMinAcceptingTime(value = 0) {
  if (value < minAcceptingTime) {
    minAcceptingTime = value;
    setField(TYPES.OPERATORS, FIELDS.MIN_ACCEPTING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMaxAcceptingTime(value = 0) {
  if (value > maxAcceptingTime) {
    maxAcceptingTime = value;
    setField(TYPES.OPERATORS, FIELDS.MAX_ACCEPTING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMinCallDuration(value = 0) {
  if (value < minDuration) {
    minDuration = value;
    setField(TYPES.CUSTOMERS, FIELDS.MIN_DURATION, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMaxCallDuration(value = 0) {
  if (value > maxDuration) {
    maxDuration = value;
    setField(TYPES.CUSTOMERS, FIELDS.MAX_DURATION, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMinConnectingTime(userType, value) {
  const minConnectingTime = parseFloat(
    getField(userType, FIELDS.MIN_CONNECTING_TIME)
  );
  if (value < minConnectingTime) {
    setField(userType, FIELDS.MIN_CONNECTING_TIME, value.toFixed(3));
    return true;
  }
  return false;
}

function checkMaxConnectingTime(userType, value) {
  const maxConnectingTime = parseFloat(
    getField(userType, FIELDS.MAX_CONNECTING_TIME)
  );
  if (value > maxConnectingTime) {
    setField(userType, FIELDS.MAX_CONNECTING_TIME, value.toFixed(3));
    return true;
  }
  return false;
}

function checkMinAuthorizingTime(userType, value) {
  const minAuthorizingTime = parseFloat(
    getField(userType, FIELDS.MIN_AUTHORIZING_TIME)
  );

  if (value < minAuthorizingTime) {
    setField(userType, FIELDS.MIN_AUTHORIZING_TIME, value.toFixed(3));
    return true;
  }
  return false;
}

function checkMaxAuthorizingTime(userType, value) {
  const maxAuthorizingTime = parseFloat(
    getField(userType, FIELDS.MAX_AUTHORIZING_TIME)
  );

  if (value > maxAuthorizingTime) {
    setField(userType, FIELDS.MAX_AUTHORIZING_TIME, value.toFixed(3));
    return true;
  }
  return false;
}

function checkAndAddCall(id) {
  if (id && !isCallInList(id)) {
    const defaultCall = addCallToList(id);
    drawCall(id);
    return defaultCall;
  }
  return null;
}

function isCallInList(id) {
  return Boolean(statistics[TYPES.CALLS][id]);
}

function addCallToList(id) {
  const defaultCall = getDefaultCall()
  statistics[TYPES.CALLS][id] = defaultCall;
  return defaultCall;
}

function updateAndDrawCall(id, updates) {
  const updatedCall = { ...statistics[TYPES.CALLS][id], ...updates };
  statistics[TYPES.CALLS][id] = updatedCall;
  drawCall(id, updates);
}

function disconnectFromSocket() {
  if (socket) {
    socket.disconnect();
  }
}

window.addEventListener('beforeunload', disconnectFromSocket);
