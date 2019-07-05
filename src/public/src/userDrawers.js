const { TYPES } = require('./constants');

const START_FIRST_CALL_ADDITIONAL_DELAY = 5000;

function drawCustomersFrames({
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
}) {
  const parent = document.querySelector('.customers-section');
  const fragment = document.createDocumentFragment();

  new Array(customersNumber).fill(1).forEach((_, i) => {
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
        (Math.max(customersNumber, operatorsNumber) - i) * connectionDelay +
        firstCallDelay + START_FIRST_CALL_ADDITIONAL_DELAY;

      iframe.contentWindow.io = io;
      iframe.contentWindow.socketOptions = socketOptions;
      iframe.contentWindow.connectionDelay = connectionDelay;
      iframe.contentWindow.userIdentity = `${now}-customer-${num}`;
      iframe.contentWindow.userType = TYPES.CUSTOMERS;
      iframe.contentWindow.startFirstCallAfter = startFirstCallAfter;
      iframe.contentWindow.callsPerCustomer = callsPerCustomer;
      iframe.contentWindow.minCallDuration = minCallDuration;
      iframe.contentWindow.maxCallDuration = maxCallDuration;
    });

    fragment.appendChild(iframe);
  });

  parent.appendChild(fragment);
}

function drawOperatorsFrames({
  io,
  operatorsNumber,
  minCallDuration,
  maxCallDuration,
  connectionDelay,
  acceptingLikelihood,
  socketOptions,
  now,
}) {
  const parent = document.querySelector('.operators-section');
  const fragment = document.createDocumentFragment();

  new Array(operatorsNumber).fill(1).forEach((_, i) => {
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
      iframe.contentWindow.userType = TYPES.OPERATORS;
      iframe.contentWindow.minCallDuration = minCallDuration;
      iframe.contentWindow.maxCallDuration = maxCallDuration;
      iframe.contentWindow.acceptingLikelihood = acceptingLikelihood;
    });
    fragment.appendChild(iframe);
  });

  parent.appendChild(fragment);
}

module.exports = {
  drawCustomersFrames,
  drawOperatorsFrames,
}
