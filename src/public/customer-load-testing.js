/* eslint-disable no-console */
const { getNowSeconds, getUserNumber, toCamelCase } = require('./src/utils');
const { SOCKET_EVENTS, CALL_STATUSES, COLORS_MAP } = require('./src/constants');

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

let globalToken = null;
let callId = undefined;
let startConnectingAt = null;
let connectedAt = null;
let startAuthorizingAt = null;
let authorizedAt = null;
let startedCalls = 0;
let requestedAtTime = null;
let enqueuedAtTime = null;
let acceptedAtTime = null;
let finishedAtTime = null;
let missCallTimer = null;
let finishCallTimer = null;
let callDuration = null;

setCallStatus(CALL_STATUSES.UNAUTHORIZED);
connectToSocket();

function connectToSocket() {
  const userNumber = getUserNumber(identity);
  const connectDelay = userNumber * connectionDelay;
  setTimeout(() => {
    startConnectingAt = getNowSeconds();
    socket = window.io(socketUrl, socketOptions);

    socket.once(SOCKET_EVENTS.CONNECT, () => {
      const now = getNowSeconds();
      connectedAt = now;
      startAuthorizingAt = now;

      socket.emit(SOCKET_EVENTS.AUTHENTICATION, { identity, deviceId });
      socket.once(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
      socket.once(SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);

      statisticsCallbacks.decrementConnectingUsers(userType);
      statisticsCallbacks.incrementConnectedUsers(userType);
      statisticsCallbacks.incrementAuthorizingUsers(userType);
      statisticsCallbacks.onUserConnected(
        userType,
        startConnectingAt,
        connectedAt
      );
    });

    statisticsCallbacks.incrementConnectingUsers(userType);
  }, connectDelay);
}

function onAuthenticated(token) {
  globalToken = token;
  authorizedAt = getNowSeconds();

  setAuthorizeStatus('Yes', globalToken);
  statisticsCallbacks.decrementAuthorizingUsers(userType);
  statisticsCallbacks.incrementAuthenticatedUsers(userType);
  statisticsCallbacks.onUserAuthorized(
    userType,
    startAuthorizingAt,
    authorizedAt
  );
  setTimeout(startCall, startFirstCallAfter);
}

function setAuthorizeStatus() {
  setCallStatus(CALL_STATUSES.IDLE);
}

function setCallStatus(status = 'Idle') {
  const colorsMapKey = toCamelCase(status);
  document.body.style.backgroundColor = COLORS_MAP[colorsMapKey];
}

function onUnauthorized(error) {
  console.error(`Customer ${identity} was not authorized: ${error}`);
  setAuthorizeStatus('No');
  setCallStatus(CALL_STATUSES.UNAUTHORIZED);
  statisticsCallbacks.decrementAuthorizingUsers(userType);
  statisticsCallbacks.incrementUnauthorizedUsers(userType);
}

function startCall() {
  if (startedCalls < callsPerCustomer) {
    startedCalls += 1;
    setCurrentCallNumber(startedCalls);
    const startCallDelay = Math.ceil(Math.random() * 10000) || 3000;
    const waitingForResponseDelay = Math.max(
      10000,
      Math.ceil(Math.random() * 20000)
    );
    callDuration = Math.max(
      Math.ceil(Math.random() * maxCallDuration),
      minCallDuration
    );

    statisticsCallbacks.incrementWaitingForQueueCalls(userType);

    setTimeout(() => {
      missCallTimer = setTimeout(makeCallMissed, waitingForResponseDelay);
      requestedAtTime = getNowSeconds();
      setCallStatus(CALL_STATUSES.CALL_REQUESTED);
      socket.emit(SOCKET_EVENTS.CALL_REQUESTED, {
        salesRepId: 'salesrep42',
        callbackEnabled: Math.random > 0.4,
      });
      socket.once(SOCKET_EVENTS.CALL_ENQUEUED, onCallEnqueued);
      socket.once(SOCKET_EVENTS.CALL_NOT_ENQUEUED, onCallNotEnqueued);
    }, startCallDelay);
  }
}

function onCallEnqueued(id) {
  socket.removeListener(SOCKET_EVENTS.CALL_NOT_ENQUEUED, onCallNotEnqueued);
  socket.once(SOCKET_EVENTS.CALL_ACCEPTED, onCallAccepted);
  if (!id) {
    console.log('onCallEnqueued no id', id);
  }
  callId = id;
  enqueuedAtTime = getNowSeconds();
  setCallStatus(CALL_STATUSES.CALL_ENQUEUED);
  statisticsCallbacks.decrementWaitingForQueueCalls(userType);
  statisticsCallbacks.incrementPendingCalls(userType, id);
  statisticsCallbacks.onCallEnqueued(id, requestedAtTime, enqueuedAtTime);
}

function onCallNotEnqueued() {
  socket.removeListener(SOCKET_EVENTS.CALL_ENQUEUED, onCallEnqueued);
  setCallStatus(CALL_STATUSES.CALL_NOT_ENQUEUED);
  statisticsCallbacks.decrementWaitingForQueueCalls(userType);
  statisticsCallbacks.incrementNotEnqueuedCalls(userType);
  setTimeout(startCall, startFirstCallAfter);
}

function onCallAccepted({ roomId, operatorId }) {
  callId = roomId;
  acceptedAtTime = getNowSeconds();
  clearTimeout(missCallTimer);
  missCallTimer = null;
  setCallStatus(CALL_STATUSES.ON_CALL, operatorId);
  setPeerId(operatorId);
  finishCallTimer = setTimeout(makeCallFinished, callDuration);
  socket.once(SOCKET_EVENTS.CALL_FINISHED, onCallFinishedByOperator);
  statisticsCallbacks.decrementPendingCalls(userType, callId);
  statisticsCallbacks.incrementActiveCalls(userType, callId);
  statisticsCallbacks.onCustomerCallAccepted(
    callId,
    requestedAtTime,
    acceptedAtTime
  );
}

function makeCallMissed() {
  socket.removeListener(SOCKET_EVENTS.CALL_ACCEPTED, onCallAccepted);
  statisticsCallbacks.decrementPendingCalls(userType, callId);
  statisticsCallbacks.incrementMissedCalls(userType, callId);
  finishCall();
}

function makeCallFinished() {
  socket.removeListener(SOCKET_EVENTS.CALL_FINISHED, onCallFinishedByOperator);
  finishedAtTime = getNowSeconds();
  statisticsCallbacks.decrementActiveCalls(userType, callId);
  statisticsCallbacks.incrementFinishedCalls(userType, callId);
  statisticsCallbacks.updateCallDurationTime(finishedAtTime - acceptedAtTime);
  finishCall();
}

function finishCall() {
  if (callId) {
    socket.emit(SOCKET_EVENTS.CALL_FINISHED, { id: callId });
  } else {
    console.log('No callID', identity, callId);
  }
  makeCustomerIdle();
}

function onCallFinishedByOperator() {
  clearTimeout(finishCallTimer);
  finishCallTimer = null;
  finishedAtTime = getNowSeconds();
  statisticsCallbacks.decrementActiveCalls(userType, callId);
  statisticsCallbacks.incrementFinishedCalls(userType, callId);
  statisticsCallbacks.updateCallDurationTime(finishedAtTime - acceptedAtTime);
  makeCustomerIdle();
}

function makeCustomerIdle() {
  setPeerId();
  setCallStatus(CALL_STATUSES.IDLE);
  // callId = null;
  startCall();
}

function disconnectFromSocket() {
  socket.disconnect();
}

function setPeerId(idRaw) {
  if (idRaw) {
    const peerId = getUserNumber(idRaw);
    document.querySelector('.peer-id').innerHTML = `/${peerId}`;
  } else {
    document.querySelector('.peer-id').innerHTML = '';
  }
}

function setCurrentCallNumber(number) {
  document.querySelector('.current-call-number').innerHTML = number;
}

window.addEventListener('beforeunload', disconnectFromSocket);
