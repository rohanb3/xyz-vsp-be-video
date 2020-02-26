/* eslint-disable no-console */
const io = require('socket.io-client');

const { SOCKET_EVENTS, TYPES, FIELDS } = require('./src/constants');
const { getDefaultStatistics, getField, setField } = require('./src/utils');
const {
  drawCustomersFrames,
  drawOperatorsFrames,
} = require('./src/userDrawers');
const {
  drawStatisitics,
  drawQueueStatisticsField,
} = require('./src/statisticsDrawers');
const {
  init: initUserStatistics,
  ...userStatistics
} = require('./src/usersStatistics');

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
let legendOpened = false;

let statistics = getDefaultStatistics();

const statisticsCallbacks = {
  onUserConnected: (...args) =>
    userStatistics.onUserConnected(...args, statistics),
  onUserAuthorized: (...args) =>
    userStatistics.onUserAuthorized(...args, statistics),
  incrementConnectingUsers: (...args) =>
    userStatistics.incrementConnectingUsers(...args, statistics),
  decrementConnectingUsers: (...args) =>
    userStatistics.decrementConnectingUsers(...args, statistics),
  incrementConnectedUsers: (...args) =>
    userStatistics.incrementConnectedUsers(...args, statistics),
  decrementConnectedUsers: (...args) =>
    userStatistics.decrementConnectedUsers(...args, statistics),
  incrementAuthorizingUsers: (...args) =>
    userStatistics.incrementAuthorizingUsers(...args, statistics),
  decrementAuthorizingUsers: (...args) =>
    userStatistics.decrementAuthorizingUsers(...args, statistics),
  incrementAuthenticatedUsers: (...args) =>
    userStatistics.incrementAuthenticatedUsers(...args, statistics),
  incrementUnauthorizedUsers: (...args) =>
    userStatistics.incrementUnauthorizedUsers(...args, statistics),
  incrementWaitingForQueueCalls: (...args) =>
    userStatistics.incrementWaitingForQueueCalls(...args, statistics),
  decrementWaitingForQueueCalls: (...args) =>
    userStatistics.decrementWaitingForQueueCalls(...args, statistics),
  incrementNotEnqueuedCalls: (...args) =>
    userStatistics.incrementNotEnqueuedCalls(...args, statistics),
  incrementPendingCalls: (...args) =>
    userStatistics.incrementPendingCalls(...args, statistics),
  decrementPendingCalls: (...args) =>
    userStatistics.decrementPendingCalls(...args, statistics),
  incrementActiveCalls: (...args) =>
    userStatistics.incrementActiveCalls(...args, statistics),
  decrementActiveCalls: (...args) =>
    userStatistics.decrementActiveCalls(...args, statistics),
  incrementFinishedCalls: (...args) =>
    userStatistics.incrementFinishedCalls(...args, statistics),
  incrementMissedCalls: (...args) =>
    userStatistics.incrementMissedCalls(...args, statistics),
  onCallEnqueued: (...args) =>
    userStatistics.onCallEnqueued(...args, statistics),
  onCallAcceptionByOperatorHandled: (...args) =>
    userStatistics.onCallAcceptionByOperatorHandled(...args, statistics),
  onCustomerCallAccepted: (...args) =>
    userStatistics.onCustomerCallAccepted(...args, statistics),
  updateCallDurationTime: (...args) =>
    userStatistics.updateCallDurationTime(...args, statistics),
  incrementOperatorsAcceptedCalls: (...args) =>
    userStatistics.incrementOperatorsAcceptedCalls(...args, statistics),
};

let totalCallsForTest = 0;

window.statisticsCallbacks = statisticsCallbacks;

subscribeToControls();

socket.on(SOCKET_EVENTS.CONNECT, () => {
  socket.emit(SOCKET_EVENTS.AUTHENTICATION, { identity, token: 'mocked-operator-user-token' });
  socket.on(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
  socket.on(SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);
});

function onAuthenticated() {
  socket.on(SOCKET_EVENTS.CALLS_CHANGED, onCallsChanged);
}

function onUnauthorized() {}

function onCallsChanged({ size = 0, peak } = {}) {
  const prevMaxInQueue = getField(statistics, TYPES.QUEUE, FIELDS.MAX_IN_QUEUE);

  setField(statistics, TYPES.QUEUE, FIELDS.PENDING_IN_QUEUE, size);
  drawQueueStatisticsField(FIELDS.PENDING_IN_QUEUE, statistics);
  if (peak && peak.requestedAt) {
    setField(statistics, TYPES.QUEUE, FIELDS.OLDEST_IN_QUEUE, peak.requestedAt);
    drawQueueStatisticsField(FIELDS.OLDEST_IN_QUEUE, statistics);
  }

  if (size > prevMaxInQueue) {
    setField(statistics, TYPES.QUEUE, FIELDS.MAX_IN_QUEUE, size);
    drawQueueStatisticsField(FIELDS.MAX_IN_QUEUE, statistics);
  }
}

function subscribeToControls() {
  document.querySelector('.start-button').addEventListener('click', startTest);
  document.querySelector('.clear-button').addEventListener('click', clearTest);
  document
    .querySelector('.all-calls-toggler')
    .addEventListener('click', toggleCalls);
  document
    .querySelector('.legend-toggler')
    .addEventListener('click', toggleLegend);
}

function startTest() {
  if (!isStarted) {
    isStarted = true;
    disableActionButtons();
    preparePage();
    initUserStatistics(totalCallsForTest, enableActionButtons);
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

function toggleLegend() {
  document
    .querySelector('.users-connection-colors-legend')
    .classList.toggle('opened');
  const toggler = document.querySelector(
    '.users-connection-colors-legend .legend-toggler'
  );
  legendOpened = !legendOpened;
  toggler.innerHTML = legendOpened ? '&#8249;' : '&#8250;';
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
    Number(document.querySelector('.max-first-call-delay').value) * 1000;

  setField(statistics, TYPES.CUSTOMERS, FIELDS.TOTAL, customersNumber);

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
    (Number(document.querySelector('.operator-accepting-likelihood').value) ||
      20) / 100;

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

  setField(statistics, TYPES.OPERATORS, FIELDS.TOTAL, operatorsNumber);
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

function disconnectFromSocket() {
  if (socket) {
    socket.disconnect();
  }
}

window.addEventListener('beforeunload', disconnectFromSocket);
