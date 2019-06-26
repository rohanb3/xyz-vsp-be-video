/* eslint-disable no-console */
const io = require('socket.io-client');

const now = Date.now();

let isStarted = false;

const CUSTOMERS = 'customers';
const OPERATORS = 'operators';
const TOTAL = 'total';
const AUTHENTICATED = 'authenticated';
const UNAUTHORIZED = 'unauthorized';
const WAITING_FOR_QUEUE_CALLS = 'waitingForQueueCalls';
const PENDING_CALLS = 'pendingCalls';
const NOT_ENQUEUED_CALLS = 'notEnqueuedCalls';
const ACTIVE_CALLS = 'activeCalls';
const FINISHED_CALLS = 'finishedCalls';
const MISSED_CALLS = 'missedCalls';
const TOTAL_CALLS = 'totalCalls';

const defaultStatistics = {
  [CUSTOMERS]: {
    [TOTAL]: 0,
    [AUTHENTICATED]: 0,
    [UNAUTHORIZED]: 0,
    [WAITING_FOR_QUEUE_CALLS]: 0,
    [NOT_ENQUEUED_CALLS]: 0,
    [PENDING_CALLS]: 0,
    [ACTIVE_CALLS]: 0,
    [FINISHED_CALLS]: 0,
    [MISSED_CALLS]: 0,
    [TOTAL_CALLS]: 0,
  },
  [OPERATORS]: {
    [TOTAL]: 0,
    [AUTHENTICATED]: 0,
    [UNAUTHORIZED]: 0,
    [ACTIVE_CALLS]: 0,
    [FINISHED_CALLS]: 0,
  },
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
};

window.statisticsCallbacks = statisticsCallbacks;

subscribeToControls(io);

function subscribeToControls() {
  document.querySelector('.start-button').addEventListener('click', startTest);
  document.querySelector('.stop-button').addEventListener('click', stopTest);
  document
    .querySelector('.reset-button')
    .addEventListener('click', resetStatistics);
}

function startTest() {
  if (!isStarted) {
    isStarted = true;
    preparePage();
  } else {
    window.alert('Test is running! Please, stop it before');
  }
}

function stopTest() {
  isStarted = false;
  removeUsers();
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
  prepareCustomers();
  prepareOperators();
  drawStatisitics();
}

function prepareCustomers() {
  const customersNumber =
    Number(document.querySelector('.customers-amount').value) || 200;
  drawCustomersFrames(customersNumber);
}

function prepareOperators() {
  const operatorsNumber =
    Number(document.querySelector('.operators-amount').value) || 50;
  drawOperatorsFrames(operatorsNumber);
}

function drawCustomersFrames(number) {
  const parent = document.querySelector('.customers-section');
  const fragment = document.createDocumentFragment();

  new Array(number).fill(1).forEach((_, i) => {
    const iframe = document.createElement('iframe');
    const num = i + 1;
    const frameContent = `
      <html>
        <body>
          <div>Customer ${num}</div>
          <div class="user-auth">
            <span>Authorized: </span><span class="auth-status">No</span>
          </div>
          <div class="user-status">
            <span>Status: </span><span class="status-title">Idle</span>
          </div>
          <script src="/customer-load-testing.js"></script>
        </body>
      </html>
    `;

    iframe.id = `customer-${num}`;
    iframe.classList.add('user-frame', 'customer-frame');
    iframe.srcdoc = frameContent;
    setTimeout(() => {
      iframe.contentWindow.io = io;
      iframe.contentWindow.userIdentity = `${now}-customer-${num}`;
      iframe.contentWindow.userType = CUSTOMERS;
    });
    fragment.appendChild(iframe);
    incrementField(CUSTOMERS, TOTAL);
  });

  parent.appendChild(fragment);
}

function drawOperatorsFrames(number) {
  const parent = document.querySelector('.operators-section');
  const fragment = document.createDocumentFragment();

  new Array(number).fill(1).forEach((_, i) => {
    const iframe = document.createElement('iframe');
    const num = i + 1;
    const frameContent = `
      <html>
        <body>
          <div>Operator ${num}</div>
          <div class="user-auth">
            <span>Authorized: </span><span class="auth-status">No</span>
          </div>
          <div class="calls-info">
            <p class="calls-size">0</p>
            <p class="oldest-call">0</p>
          </div>
          <div class="user-status">
            <span>Status: </span><span class="status-title">Idle</span>
          </div>
          <script src="/operator-load-testing.js"></script>
        </body>
      </html>
    `;

    iframe.id = `operator-${num}`;
    iframe.classList.add('user-frame', 'operator-frame');
    iframe.srcdoc = frameContent;
    setTimeout(() => {
      iframe.contentWindow.io = io;
      iframe.contentWindow.userIdentity = `${now}-operator-${num}`;
      iframe.contentWindow.userType = OPERATORS;
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
  return userType === CUSTOMERS
    ? drawCustomerStatisticsField
    : drawOperatorStatisticsField;
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
  getStatisticsFieldDrawer(userType)(FINISHED_CALLS);
}

function incrementTotalCalls(userType) {
  incrementField(userType, TOTAL_CALLS);
  getStatisticsFieldDrawer(userType)(TOTAL_CALLS);
}

function incrementField(userType, field) {
  try {
    statistics[userType][field] += 1;
  } catch (e) {
    console.error(`Field ${field} cannot be incremented for ${userType}: ${e}`);
  }
}

function decrementField(userType, field) {
  try {
    statistics[userType][field] -= 1;
  } catch (e) {
    console.error(`Field ${field} cannot be decremented for ${userType}: ${e}`);
  }
}

function getDefaultStatistics() {
  return {
    [CUSTOMERS]: { ...defaultStatistics[CUSTOMERS] },
    [OPERATORS]: { ...defaultStatistics[OPERATORS] },
  };
}

function camelToKebab(str) {
  return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}
