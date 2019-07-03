/* eslint-disable no-console */
const io = require('socket.io-client');

const isLocal = typeof window.prompt('Is local?') === 'string';
const now = Date.now();
const socketUrl = '/operators';
const socketOptions = { transports: ['websocket'] };

if (!isLocal) {
  socketOptions.path = '/api/video/socket.io';
}

const identity = `${now}-operator-0`;
const socket = io(socketUrl, socketOptions);

const SOCKET_EVENTS = {
  CONNECT: 'connect',
  AUTHENTICATION: 'authentication',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  CALLS_CHANGED: 'calls.changed',
};

let isStarted = false;

const QUEUE = 'queue';
const CUSTOMERS = 'customers';
const OPERATORS = 'operators';
const TOTAL = 'total';
const AUTHENTICATED = 'authenticated';
const UNAUTHORIZED = 'unauthorized';
const WAITING_FOR_QUEUE_CALLS = 'waitingForQueueCalls';
const PENDING_CALLS = 'pendingCalls';
const NOT_ENQUEUED_CALLS = 'notEnqueuedCalls';
const ACTIVE_CALLS = 'activeCalls';
const MAX_ACTIVE_CALLS = 'maxActiveCalls';
const FINISHED_CALLS = 'finishedCalls';
const MISSED_CALLS = 'missedCalls';
const TOTAL_CALLS = 'totalCalls';
const PENDING_IN_QUEUE = 'pendingInQueue';
const OLDEST_IN_QUEUE = 'oldestInQueue';
const MIN_ENQUEUEING_TIME = 'minEnqueueingTime';
const MAX_ENQUEUEING_TIME = 'maxEnqueueingTime';
const AVERAGE_ENQUEUEING_TIME = 'averageEnqueueingTime';
const MIN_ACCEPTING_TIME = 'minAcceptingTime';
const MAX_ACCEPTING_TIME = 'maxAcceptingTime';
const AVERAGE_ACCEPTING_TIME = 'averageAcceptingTime';
const MIN_DURATION = 'minDuration';
const MAX_DURATION = 'maxDuration';
const AVERAGE_DURATION = 'averageDuration';
const TOTAL_DURATION = 'totalDuration';
const MAX_IN_QUEUE = 'maxInQueue';

const defaultStatistics = {
  [QUEUE]: {
    [PENDING_IN_QUEUE]: 0,
    [OLDEST_IN_QUEUE]: 0,
    [MAX_IN_QUEUE]: 0,
  },
  [CUSTOMERS]: {
    [TOTAL]: 0,
    [AUTHENTICATED]: 0,
    [UNAUTHORIZED]: 0,
    [WAITING_FOR_QUEUE_CALLS]: 0,
    [NOT_ENQUEUED_CALLS]: 0,
    [PENDING_CALLS]: 0,
    [ACTIVE_CALLS]: 0,
    [MAX_ACTIVE_CALLS]: 0,
    [FINISHED_CALLS]: 0,
    [MISSED_CALLS]: 0,
    [TOTAL_CALLS]: 0,
    [MIN_ENQUEUEING_TIME]: 0,
    [MAX_ENQUEUEING_TIME]: 0,
    [AVERAGE_ENQUEUEING_TIME]: 0,
    [MIN_ACCEPTING_TIME]: 0,
    [MAX_ACCEPTING_TIME]: 0,
    [AVERAGE_ACCEPTING_TIME]: 0,
    [MIN_DURATION]: 0,
    [MAX_DURATION]: 0,
    [AVERAGE_DURATION]: 0,
    [TOTAL_DURATION]: 0,
  },
  [OPERATORS]: {
    [TOTAL]: 0,
    [AUTHENTICATED]: 0,
    [UNAUTHORIZED]: 0,
    [ACTIVE_CALLS]: 0,
    [FINISHED_CALLS]: 0,
    [MIN_ACCEPTING_TIME]: 0,
    [MAX_ACCEPTING_TIME]: 0,
    [AVERAGE_ACCEPTING_TIME]: 0,
    [TOTAL_CALLS]: 0,
  },
};

const drawersMap = {
  [QUEUE]: drawQueueStatisticsField,
  [CUSTOMERS]: drawCustomerStatisticsField,
  [OPERATORS]: drawOperatorStatisticsField,
};

let statistics = getDefaultStatistics();

const statisticsCallbacks = {
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
  updateCallEnqueueingTime,
  updateCallAcceptingTime,
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

subscribeToControls(io);

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
  const prevMaxInQueue = getField(QUEUE, MAX_IN_QUEUE);

  setField(QUEUE, PENDING_IN_QUEUE, size);
  drawQueueStatisticsField(PENDING_IN_QUEUE);
  if (peak && peak.requestedAt) {
    setField(QUEUE, OLDEST_IN_QUEUE, peak.requestedAt);
    drawQueueStatisticsField(OLDEST_IN_QUEUE);
  }

  if (size > prevMaxInQueue) {
    setField(QUEUE, MAX_IN_QUEUE, size);
    drawQueueStatisticsField(MAX_IN_QUEUE);
  }
}

function subscribeToControls() {
  document.querySelector('.start-button').addEventListener('click', startTest);
  document.querySelector('.clear-button').addEventListener('click', clearTest);
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
  enableActionButtons();
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
    drawStatisitics();
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
  drawStatisitics();
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

  totalCallsForTest = customersNumber * callsPerCustomer;

  drawCustomersFrames(
    customersNumber,
    operatorsNumber,
    callsPerCustomer,
    minCallDuration,
    maxCallDuration,
    connectionDelay,
    maxFirstCallDelay
  );
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
  drawOperatorsFrames(
    operatorsNumber,
    minCallDuration,
    maxCallDuration,
    connectionDelay,
    acceptingLikelihood
  );
}

function drawCustomersFrames(
  number,
  operatorsNumber,
  callsPerCustomer,
  minCallDuration,
  maxCallDuration,
  connectionDelay,
  maxFirstCallDelay
) {
  const parent = document.querySelector('.customers-section');
  const fragment = document.createDocumentFragment();

  new Array(number).fill(1).forEach((_, i) => {
    const iframe = document.createElement('iframe');
    const num = i + 1;
    const frameContent = `
      <html>
        <body>
          <p style="margin: 0; text-align: center">
            <span>${num}</span>
            <span class="peer-id"></span>
          </p>
          <p style="margin: 0; text-align: center">
            <span class="current-call-number">0</span>
            <span>/</span>
            <span class="total-allowed-calls">${callsPerCustomer}</span>
          </p>
          <script src="/js/customer-load-testing.js"></script>
        </body>
      </html>
    `;

    iframe.id = `customer-${num}`;
    iframe.classList.add('user-frame', 'customer-frame');
    iframe.srcdoc = frameContent;

    setTimeout(() => {
      const firstCallDelay = Math.ceil(Math.random() * maxFirstCallDelay);
      const startFirstCallAfter =
        (Math.max(number, operatorsNumber) - i) * connectionDelay +
        firstCallDelay;

      iframe.contentWindow.io = io;
      iframe.contentWindow.socketOptions = socketOptions;
      iframe.contentWindow.connectionDelay = connectionDelay;
      iframe.contentWindow.userIdentity = `${now}-customer-${num}`;
      iframe.contentWindow.userType = CUSTOMERS;
      iframe.contentWindow.startFirstCallAfter = startFirstCallAfter;
      iframe.contentWindow.callsPerCustomer = callsPerCustomer;
      iframe.contentWindow.minCallDuration = minCallDuration;
      iframe.contentWindow.maxCallDuration = maxCallDuration;
    });

    fragment.appendChild(iframe);
    incrementField(CUSTOMERS, TOTAL);
  });

  parent.appendChild(fragment);
}

function drawOperatorsFrames(
  number,
  minCallDuration,
  maxCallDuration,
  connectionDelay,
  acceptingLikelihood
) {
  const parent = document.querySelector('.operators-section');
  const fragment = document.createDocumentFragment();

  new Array(number).fill(1).forEach((_, i) => {
    const iframe = document.createElement('iframe');
    const num = i + 1;
    const frameContent = `
      <html>
        <body>
          <p style="margin: 0; text-align: center">
            <span>${num}</span>
            <span class="peer-id"></span>
          </p>
          <script src="/js/operator-load-testing.js"></script>
        </body>
      </html>
    `;

    iframe.id = `operator-${num}`;
    iframe.classList.add('user-frame', 'operator-frame');
    iframe.srcdoc = frameContent;
    setTimeout(() => {
      iframe.contentWindow.io = io;
      iframe.contentWindow.socketOptions = socketOptions;
      iframe.contentWindow.connectionDelay = connectionDelay;
      iframe.contentWindow.userIdentity = `${now}-operator-${num}`;
      iframe.contentWindow.userType = OPERATORS;
      iframe.contentWindow.minCallDuration = minCallDuration;
      iframe.contentWindow.maxCallDuration = maxCallDuration;
      iframe.contentWindow.acceptingLikelihood = acceptingLikelihood;
    });
    fragment.appendChild(iframe);
    incrementField(OPERATORS, TOTAL);
  });

  parent.appendChild(fragment);
}

function removeUsers() {
  removeFrames('.customers-section');
  removeFrames('.operators-section');
}

function removeFrames(selector) {
  const iframes = document.querySelectorAll(`${selector} iframe`);
  for (var i = 0; i < iframes.length; i++) {
    iframes[i].contentWindow.disconnectFromSocket();
    iframes[i].parentNode.removeChild(iframes[i]);
  }
}

function drawStatisitics() {
  Object.keys(statistics).forEach(userType => {
    const container = getStatisticsContainer(userType);

    if (container) {
      const statisticData = statistics[userType];

      Object.keys(statisticData).forEach(field =>
        drawStatisiticsField(container, field, statisticData[field])
      );
    }
  });
}

function getStatisticsContainer(userType) {
  return document.querySelector(`.testing-statistics .${userType}-statistics`);
}

function getStatisticsFieldDrawer(userType) {
  const defaultDrawer = () => {};
  return drawersMap[userType] || defaultDrawer;
}

function drawQueueStatisticsField(field) {
  const container = getStatisticsContainer(QUEUE);
  const value = statistics[QUEUE][field];
  drawStatisiticsField(container, field, value);
}

function drawCustomerStatisticsField(field) {
  const container = getStatisticsContainer(CUSTOMERS);
  const value = statistics[CUSTOMERS][field];
  drawStatisiticsField(container, field, value);
}

function drawOperatorStatisticsField(field) {
  const container = getStatisticsContainer(OPERATORS);
  const value = statistics[OPERATORS][field];
  drawStatisiticsField(container, field, value);
}

function drawStatisiticsField(container, field, value) {
  const seclector = `.${camelToKebab(field)} .quantity`;
  const el = container.querySelector(seclector);
  if (el) {
    el.innerHTML = value;
  }
}

function incrementAuthenticatedUsers(userType) {
  incrementField(userType, AUTHENTICATED);
  getStatisticsFieldDrawer(userType)(AUTHENTICATED);
}

function incrementUnauthorizedUsers(userType) {
  incrementField(userType, UNAUTHORIZED);
  getStatisticsFieldDrawer(userType)(UNAUTHORIZED);
}

function incrementWaitingForQueueCalls(userType) {
  incrementField(userType, WAITING_FOR_QUEUE_CALLS);
  getStatisticsFieldDrawer(userType)(WAITING_FOR_QUEUE_CALLS);
}

function decrementWaitingForQueueCalls(userType) {
  decrementField(userType, WAITING_FOR_QUEUE_CALLS);
  getStatisticsFieldDrawer(userType)(WAITING_FOR_QUEUE_CALLS);
}

function incrementNotEnqueuedCalls(userType) {
  incrementField(userType, NOT_ENQUEUED_CALLS);
  getStatisticsFieldDrawer(userType)(NOT_ENQUEUED_CALLS);
}

function incrementPendingCalls(userType) {
  incrementField(userType, PENDING_CALLS);
  getStatisticsFieldDrawer(userType)(PENDING_CALLS);
}

function decrementPendingCalls(userType) {
  decrementField(userType, PENDING_CALLS);
  getStatisticsFieldDrawer(userType)(PENDING_CALLS);
}

function incrementActiveCalls(userType) {
  incrementField(userType, ACTIVE_CALLS);
  getStatisticsFieldDrawer(userType)(ACTIVE_CALLS);

  const currentActiveCalls = getField(userType, ACTIVE_CALLS);
  const maxActiveCalls = getField(userType, MAX_ACTIVE_CALLS);

  if (currentActiveCalls > maxActiveCalls) {
    setField(userType, MAX_ACTIVE_CALLS, currentActiveCalls);
    getStatisticsFieldDrawer(userType)(MAX_ACTIVE_CALLS);
  }
}

function decrementActiveCalls(userType) {
  decrementField(userType, ACTIVE_CALLS);
  getStatisticsFieldDrawer(userType)(ACTIVE_CALLS);
}

function incrementFinishedCalls(userType) {
  incrementField(userType, FINISHED_CALLS);
  incrementTotalCalls(userType);
  getStatisticsFieldDrawer(userType)(FINISHED_CALLS);
}

function incrementMissedCalls(userType) {
  incrementField(userType, MISSED_CALLS);
  incrementTotalCalls(userType);
  getStatisticsFieldDrawer(userType)(MISSED_CALLS);
}

function incrementOperatorsAcceptedCalls() {
  incrementTotalCalls(OPERATORS);
}

function updateCallEnqueueingTime(value = 0) {
  if (checkMinEnqueueingTime(value)) {
    drawCustomerStatisticsField(MIN_ENQUEUEING_TIME);
  }

  if (checkMaxEnqueueingTime(value)) {
    drawCustomerStatisticsField(MAX_ENQUEUEING_TIME);
  }

  totalEnqueueingTime += value;

  const totalCalls = getField(CUSTOMERS, TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalEnqueueingTime) / totalCalls).toFixed(2)
    : 0;
  setField(CUSTOMERS, AVERAGE_ENQUEUEING_TIME, average);
  drawCustomerStatisticsField(AVERAGE_ENQUEUEING_TIME);
}

function updateCallAcceptingTime(value = 0) {
  if (checkMinAcceptingTime(value)) {
    drawOperatorStatisticsField(MIN_ACCEPTING_TIME);
  }

  if (checkMaxAcceptingTime(value)) {
    drawOperatorStatisticsField(MAX_ACCEPTING_TIME);
  }

  totalAcceptingTime += value;

  const totalCalls = getField(OPERATORS, TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalAcceptingTime) / totalCalls).toFixed(2)
    : 0;
  setField(OPERATORS, AVERAGE_ACCEPTING_TIME, average);
  drawOperatorStatisticsField(AVERAGE_ACCEPTING_TIME);
}

function updateCallDurationTime(value = 0) {
  if (checkMinCallDuration(value)) {
    drawCustomerStatisticsField(MIN_DURATION);
  }

  if (checkMaxCallDuration(value)) {
    drawCustomerStatisticsField(MAX_DURATION);
  }

  totalDuration += value;

  const totalCalls = getField(CUSTOMERS, TOTAL_CALLS);
  const average = totalCalls
    ? (Number(totalDuration) / totalCalls).toFixed(2)
    : 0;
  setField(CUSTOMERS, AVERAGE_DURATION, average);
  setField(CUSTOMERS, TOTAL_DURATION, totalDuration.toFixed(2));
  drawCustomerStatisticsField(AVERAGE_DURATION);
  drawCustomerStatisticsField(TOTAL_DURATION);
}

function incrementTotalCalls(userType) {
  incrementField(userType, TOTAL_CALLS);
  getStatisticsFieldDrawer(userType)(TOTAL_CALLS);
  const totalCalls = getField(CUSTOMERS, TOTAL_CALLS);
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
    setField(CUSTOMERS, MIN_ENQUEUEING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMaxEnqueueingTime(value = 0) {
  if (value > maxEnqueueingTime) {
    maxEnqueueingTime = value;
    setField(CUSTOMERS, MAX_ENQUEUEING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMinAcceptingTime(value = 0) {
  if (value < minAcceptingTime) {
    minAcceptingTime = value;
    setField(OPERATORS, MIN_ACCEPTING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMaxAcceptingTime(value = 0) {
  if (value > maxAcceptingTime) {
    maxAcceptingTime = value;
    setField(OPERATORS, MAX_ACCEPTING_TIME, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMinCallDuration(value = 0) {
  if (value < minDuration) {
    minDuration = value;
    setField(CUSTOMERS, MIN_DURATION, value.toFixed(2));
    return true;
  }
  return false;
}

function checkMaxCallDuration(value = 0) {
  if (value > maxDuration) {
    maxDuration = value;
    setField(CUSTOMERS, MAX_DURATION, value.toFixed(2));
    return true;
  }
  return false;
}

function getDefaultStatistics() {
  return {
    [QUEUE]: { ...defaultStatistics[QUEUE] },
    [CUSTOMERS]: { ...defaultStatistics[CUSTOMERS] },
    [OPERATORS]: { ...defaultStatistics[OPERATORS] },
  };
}

function disconnectFromSocket() {
  if (socket) {
    socket.disconnect();
  }
}

function camelToKebab(str) {
  return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

window.addEventListener('beforeunload', disconnectFromSocket);
