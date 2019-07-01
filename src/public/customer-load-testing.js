/* eslint-disable no-console */

const socketUrl = '/customers';

let socket = null;
const {
  userIdentity: identity,
  userType,
  startFirstCallAfter,
  callsPerCustomer,
  minCallDuration,
  maxCallDuration,
  socketOptions,
  connectionDelay,
} = window;
const { statisticsCallbacks } = window.parent;
const deviceId = `device-${identity}`;

window.disconnectFromSocket = disconnectFromSocket;

const colorsMap = {
  idle: '#CFD8DC',
  callRequested: '#FFF9C4',
  callEnqueued: '#C5CAE9',
  callNotEnqueued: '#ffcdd2',
  onCall: '#C8E6C9',
  unauthorized: '#B0BEC5',
};

const SOCKET_EVENTS = {
  CONNECT: 'connect',
  AUTHENTICATION: 'authentication',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  CALL_REQUESTED: 'call.requested',
  CALL_ENQUEUED: 'call.enqueued',
  CALL_NOT_ENQUEUED: 'call.not.enqueued',
  CALL_ACCEPTED: 'call.accepted',
  CALL_FINISHED: 'call.finished',
};

const CALL_STATUSES = {
  IDLE: 'Idle',
  CALL_REQUESTED: 'Call requested',
  CALL_ENQUEUED: 'Call enqueued',
  CALL_NOT_ENQUEUED: 'Call not enqueued',
  ON_CALL: 'On call',
  UNAUTHORIZED: 'Unauthorized',
};

const finishedCallsIds = [];

let globalToken = null;
let callId = null;
let startedCalls = 0;
let requestedAtTime = null;
let enqueuedAtTime = null;
let acceptedAtTime = null;
let finishedAtTime = null;

setCallStatus(CALL_STATUSES.UNAUTHORIZED);
connectToSocket();

function connectToSocket() {
  const userNumber = getUserNumber(identity);
  const connectDelay = userNumber * connectionDelay;
  setTimeout(() => {
    socket = window.io(socketUrl, socketOptions);

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      socket.emit(SOCKET_EVENTS.AUTHENTICATION, { identity, deviceId });
      socket.on(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
      socket.on(SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);
    });
  }, connectDelay);
}

function onAuthenticated(token) {
  globalToken = token;
  setAuthorizeStatus('Yes', globalToken);
  statisticsCallbacks.incrementAuthenticatedUsers(userType);
  setTimeout(startCall, startFirstCallAfter);
}

function setAuthorizeStatus() {
  setCallStatus(CALL_STATUSES.IDLE);
}

function setCallStatus(status = 'Idle') {
  const colorsMapKey = toCamelCase(status);
  document.body.style.backgroundColor = colorsMap[colorsMapKey];
}

function onUnauthorized(error) {
  console.error(`Customer ${identity} was not authorized: ${error}`);
  setAuthorizeStatus('No');
  setCallStatus(CALL_STATUSES.UNAUTHORIZED);
  statisticsCallbacks.incrementUnauthorizedUsers(userType);
}

function startCall() {
  if (startedCalls < callsPerCustomer) {
    startedCalls += 1;
    const startCallDelay = Math.ceil(Math.random() * 10000) || 3000;
    const waitingForResponseDelay = Math.max(
      10000,
      Math.ceil(Math.random() * 20000)
    );
    const callDuration = Math.max(Math.ceil(Math.random() * maxCallDuration), minCallDuration);

    statisticsCallbacks.incrementWaitingForQueueCalls(userType);

    setTimeout(() => {
      const missCallTimer = setTimeout(makeCallMissed, waitingForResponseDelay);
      requestedAtTime = getNowSeconds();
      setCallStatus(CALL_STATUSES.CALL_REQUESTED);
      socket.emit(SOCKET_EVENTS.CALL_REQUESTED, {
        salesRepId: 'salesrep42',
        callbackEnabled: Math.random > 0.4,
      });
      socket.once(SOCKET_EVENTS.CALL_ENQUEUED, onCallEnqueued);
      socket.once(SOCKET_EVENTS.CALL_NOT_ENQUEUED, onCallNotEnqueued);
      socket.once(SOCKET_EVENTS.CALL_ACCEPTED, ({ roomId, operatorId }) => {
        callId = roomId;
        acceptedAtTime = getNowSeconds();
        clearTimeout(missCallTimer);
        setCallStatus(CALL_STATUSES.ON_CALL, operatorId);
        setPeerId(operatorId);
        const finishCallTimer = setTimeout(() => {
          socket.removeListener(SOCKET_EVENTS.CALL_FINISHED, finishCallByCustomerListener);
          makeCallFinished();
        }, callDuration);
        const finishCallByCustomerListener = () => onCallFinishedByOperator(finishCallTimer);
        socket.once(SOCKET_EVENTS.CALL_FINISHED, finishCallByCustomerListener);
        statisticsCallbacks.decrementPendingCalls(userType);
        statisticsCallbacks.incrementActiveCalls(userType);
      });
    }, startCallDelay);
  }
}

function onCallEnqueued(id) {
  callId = id;
  enqueuedAtTime = getNowSeconds();
  setCallStatus(CALL_STATUSES.CALL_ENQUEUED);
  statisticsCallbacks.decrementWaitingForQueueCalls(userType);
  statisticsCallbacks.incrementPendingCalls(userType);
  statisticsCallbacks.updateCallEnqueueingTime(enqueuedAtTime - requestedAtTime);
}

function onCallNotEnqueued() {
  setCallStatus(CALL_STATUSES.CALL_NOT_ENQUEUED);
  statisticsCallbacks.decrementWaitingForQueueCalls(userType);
  statisticsCallbacks.incrementNotEnqueuedCalls(userType);
}

function makeCallMissed() {
  if (!finishedCallsIds.includes(callId)) {
    finishedCallsIds.push(callId);
    statisticsCallbacks.decrementPendingCalls(userType);
    statisticsCallbacks.incrementMissedCalls(userType);
  }
  finishCall();
}

function makeCallFinished() {
  if (!finishedCallsIds.includes(callId)) {
    finishedAtTime = getNowSeconds();
    finishedCallsIds.push(callId);
    statisticsCallbacks.decrementActiveCalls(userType);
    statisticsCallbacks.incrementFinishedCalls(userType);
    statisticsCallbacks.updateCallDurationTime(finishedAtTime - acceptedAtTime);
  }
  finishCall();
}

function finishCall() {
  if (callId) {
    socket.emit(SOCKET_EVENTS.CALL_FINISHED, { id: callId });
    callId = null;
  }
  makeCustomerIdle();
}

function onCallFinishedByOperator(finishCallTimer) {
  clearTimeout(finishCallTimer);
  if (!finishedCallsIds.includes(callId)) {
    finishedAtTime = getNowSeconds();
    finishedCallsIds.push(callId);
    statisticsCallbacks.decrementActiveCalls(userType);
    statisticsCallbacks.incrementFinishedCalls(userType);
    statisticsCallbacks.updateCallDurationTime(finishedAtTime - acceptedAtTime);
    makeCustomerIdle();
  }
  callId = null;
}

function makeCustomerIdle() {
  setPeerId();
  setCallStatus(CALL_STATUSES.IDLE);
  startCall();
}

function disconnectFromSocket() {
  socket.disconnect();
}

function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/\s[a-z]/g, match => match.trim().toUpperCase());
}

function getUserNumber(id = '') {
  return Number(id.match(/[0-9]*$/)[0]);
}

function setPeerId(idRaw) {
  if (idRaw) {
    const peerId = getUserNumber(idRaw);
    document.querySelector('.peer-id').innerHTML = `${peerId}`;
  } else {
    document.querySelector('.peer-id').innerHTML = '';
  }
}

function getNowSeconds() {
  return Date.now() / 1000;
}

window.addEventListener('beforeunload', disconnectFromSocket);
