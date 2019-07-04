const { TYPES } = require('./constants');

const drawersMap = {
  [TYPES.QUEUE]: drawQueueStatisticsField,
  [TYPES.CUSTOMERS]: drawCustomerStatisticsField,
  [TYPES.OPERATORS]: drawOperatorStatisticsField,
};

function drawStatisitics(statistics) {
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

function drawStatisiticsField(container, field, value) {
  const seclector = `.${camelToKebab(field)} .quantity`;
  const el = container.querySelector(seclector);
  if (el) {
    el.innerHTML = (value === Infinity || isNaN(value)) ? 0 : value;
  }
}

function getStatisticsContainer(userType) {
  return document.querySelector(`.testing-statistics .${userType}-statistics`);
}

function getStatisticsFieldDrawer(userType) {
  const defaultDrawer = () => {};
  return drawersMap[userType] || defaultDrawer;
}

function drawQueueStatisticsField(field, statistics) {
  const container = getStatisticsContainer(TYPES.QUEUE);
  const value = statistics[TYPES.QUEUE][field];
  drawStatisiticsField(container, field, value);
}

function drawCustomerStatisticsField(field, statistics) {
  const container = getStatisticsContainer(TYPES.CUSTOMERS);
  const value = statistics[TYPES.CUSTOMERS][field];
  drawStatisiticsField(container, field, value);
}

function drawOperatorStatisticsField(field, statistics) {
  const container = getStatisticsContainer(TYPES.OPERATORS);
  const value = statistics[TYPES.OPERATORS][field];
  drawStatisiticsField(container, field, value);
}

function drawCall(id, updates) {
  const container = document.querySelector('.all-calls-statistics .all-calls');
  if (!updates) {
    const callWrapper = document.createElement('div');
    callWrapper.classList.add(`call-${id}`);
    callWrapper.classList.add(`call-wrapper`);
    const callTemplate = `
      <p>${id}</p>
      <p class="requested-at">Requested at: <span class="value"></span></p>
      <p class="enqueued-at">Enqueued at: <span class="value"></span></p>
      <p class="wrapping-up-customer">Wrapped for customer: <span class="value"></span></p>
      <p class="accepted-at">Accepted at: <span class="value"></span></p>
      <p class="wrapping-up-operator">Wrapped for operator: <span class="value"></span></p>
      <p class="ready-for-customer-at">Ready for customer at: <span class="value"></span></p>
      <p class="ready-for-operator-at">Ready for operator at: <span class="value"></span></p>
      <p class="connection-to-call-customer">Conneted customer: <span class="value"></span></p>
      <p class="connection-to-call-operator">Conneted operator: <span class="value"></span></p>
    `;
    callWrapper.innerHTML = callTemplate;
    container.appendChild(callWrapper);
  } else {
    const callWrapper = document.querySelector(`.call-${id}`);
    Object.keys(updates).forEach(key => {
      const selector = `.${camelToKebab(key)} .value`;
      const el = callWrapper.querySelector(selector);
      el.innerHTML = updates[key];
    });
  }
}

function camelToKebab(str) {
  return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

module.exports = {
  drawStatisitics,
  drawStatisiticsField,
  getStatisticsContainer,
  getStatisticsFieldDrawer,
  drawQueueStatisticsField,
  drawCustomerStatisticsField,
  drawOperatorStatisticsField,
  drawCall,
}
