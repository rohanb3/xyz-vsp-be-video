/* eslint-disable no-console */

const socketUrl = '/customers';
const socketOptions = { transports: ['websocket'] };

let socket = null;
const { userIdentity: identity, userType, startFirstCallAfter } = window;
const { statisticsCallbacks } = window.parent;
const deviceId = `device-${identity}`;

window.disconnectFromSocket = disconnectFromSocket;
document.body.style.fontSize = '10px';

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

setCallStatus(CALL_STATUSES.IDLE);
connectToSocket();

function connectToSocket() {
  const userNumber = getUserNumber(identity);
  const connectDelay = userNumber * 100;
  setTimeout(() => {
    socket = window.io(socketUrl, socketOptions);

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      setAuthorizeStatus('Authorizing...');
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
  console.log('startFirstCallAfter', startFirstCallAfter);
  setTimeout(startCall, startFirstCallAfter);
}

function setAuthorizeStatus(status = 'No') {
  document.querySelector('.user-auth .auth-status').innerHTML = status;
}

function setCallStatus(status = 'Idle', peerId = '') {
  const message = peerId ? `${status} witn ${peerId}` : status;
  const colorsMapKey = toCamelCase(status);
  document.querySelector('.user-status .status-title').innerHTML = message;
  document.body.style.backgroundColor = colorsMap[colorsMapKey];
}

function onUnauthorized(error) {
  console.error(`Customer ${identity} was not authorized: ${error}`);
  setAuthorizeStatus('No');
  setCallStatus(CALL_STATUSES.UNAUTHORIZED);
  statisticsCallbacks.incrementUnauthorizedUsers(userType);
}

function startCall() {
  const startCallDelay = Math.ceil(Math.random() * 10000) || 3000;
  const waitingForResponseDelay = Math.max(
    10000,
    Math.ceil(Math.random() * 20000)
  );
  const callDuration = Math.ceil(Math.random() * 20000) || 3000;

  statisticsCallbacks.incrementWaitingForQueueCalls(userType);

  setTimeout(() => {
    const missCallTimer = setTimeout(makeCallMissed, waitingForResponseDelay);
    setCallStatus(CALL_STATUSES.CALL_REQUESTED);
    socket.emit(SOCKET_EVENTS.CALL_REQUESTED, {
      salesRepId: 'salesrep42',
      callbackEnabled: Math.random > 0.4,
    });
    socket.once(SOCKET_EVENTS.CALL_ENQUEUED, onCallEnqueued);
    socket.once(SOCKET_EVENTS.CALL_NOT_ENQUEUED, onCallNotEnqueued);
    socket.once(SOCKET_EVENTS.CALL_ACCEPTED, ({ roomId, operatorId }) => {
      callId = roomId;
      clearTimeout(missCallTimer);
      setCallStatus(CALL_STATUSES.ON_CALL, operatorId);
      setTimeout(makeCallFinished, callDuration);
      socket.once(SOCKET_EVENTS.CALL_FINISHED, onCallFinishedByOperator);
      statisticsCallbacks.decrementPendingCalls(userType);
      statisticsCallbacks.incrementActiveCalls(userType);
    });
  }, startCallDelay);
}

function onCallEnqueued(id) {
  callId = id;
  setCallStatus(CALL_STATUSES.CALL_ENQUEUED);
  statisticsCallbacks.decrementWaitingForQueueCalls(userType);
  statisticsCallbacks.incrementPendingCalls(userType);
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
    finishedCallsIds.push(callId);
    statisticsCallbacks.decrementActiveCalls(userType);
    statisticsCallbacks.incrementFinishedCalls(userType);
  }
  finishCall();
}

function finishCall() {
  if (callId) {
    socket.emit(SOCKET_EVENTS.CALL_FINISHED, { id: callId });
    callId = null;
  }
  setCallStatus(CALL_STATUSES.IDLE);
}

function onCallFinishedByOperator() {
  if (!finishedCallsIds.includes(callId)) {
    finishedCallsIds.push(callId);
    statisticsCallbacks.decrementActiveCalls(userType);
    statisticsCallbacks.incrementFinishedCalls(userType);
  }
  callId = null;
  setCallStatus(CALL_STATUSES.IDLE);
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

window.addEventListener('beforeunload', disconnectFromSocket);
