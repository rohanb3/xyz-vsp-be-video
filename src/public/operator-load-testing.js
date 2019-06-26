/* eslint-disable no-console */

const socketUrl = '/operators';
const socketOptions = { transports: ['websocket'] };

let socket = null;
const { userIdentity: identity, userType } = window;
const { statisticsCallbacks } = window.parent;

let isOperatorOnCall = false;
let pendingCallsSize = 0;

window.disconnectFromSocket = disconnectFromSocket;
document.body.style.fontSize = '10px';

const colorsMap = {
  idle: '#CFD8DC',
  callAccepted: '#FFF9C4',
  callAcceptingFailed: '#ffcdd2',
  onCall: '#C8E6C9',
  unauthorized: '#B0BEC5',
};

const CALL_STATUSES = {
  IDLE: 'Idle',
  CALL_ACCEPTED: 'Call accepted',
  CALL_ACCEPTING_FAILED: 'Call accepting failed',
  ON_CALL: 'On call',
  UNAUTHORIZED: 'Unauthorized',
};

const SOCKET_EVENTS = {
  CONNECT: 'connect',
  AUTHENTICATION: 'authentication',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  CALL_ACCEPTED: 'call.accepted',
  CALL_FINISHED: 'call.finished',
  CALLBACK_REQUESTED: 'callback.requested',
  CALLBACK_REQUESTING_FAILED: 'callback.requesting.failed',
  CALLBACK_ACCEPTED: 'callback.accepted',
  CALLBACK_DECLINED: 'callback.declined',
  CALLS_CHANGED: 'calls.changed',
  ROOM_CREATED: 'room.created',
  CALLS_EMPTY: 'calls.empty',
  CALL_ACCEPTING_FAILED: 'call.accepting.failed',
  CALL_FINISED_BY_CUSTOMER: 'call.finished.by.customer',
};

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
      socket.emit(SOCKET_EVENTS.AUTHENTICATION, { identity });
      socket.on(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
      socket.on(SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);
    });
  }, connectDelay);
}

function onAuthenticated() {
  setAuthorizeStatus('Yes');
  statisticsCallbacks.incrementAuthenticatedUsers(userType);
  socket.on(SOCKET_EVENTS.CALLS_CHANGED, onCallsChanged);
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
  console.error(`Operator ${identity} was not authorized: ${error}`);
  setAuthorizeStatus('No');
  setCallStatus(CALL_STATUSES.UNAUTHORIZED);
  statisticsCallbacks.incrementUnauthorizedUsers(userType);
}

function disconnectFromSocket() {
  socket.disconnect();
}

function onCallsChanged(data) {
  updatePendingCallsData(data);
  acceptCallIfPossible();
}

function acceptCallIfPossible() {
  const canCallBeAccepted =
    !isOperatorOnCall && pendingCallsSize && Math.random() > 0.5;
  if (canCallBeAccepted) {
    acceptCall();
  }
}

function acceptCall() {
  isOperatorOnCall = true;
  setCallStatus(CALL_STATUSES.CALL_ACCEPTED);
  socket.emit(SOCKET_EVENTS.CALL_ACCEPTED);
  socket.once(SOCKET_EVENTS.ROOM_CREATED, onRoomCreated);
  socket.once(SOCKET_EVENTS.CALL_ACCEPTING_FAILED, onCallAcceptingFailed);
}

function updatePendingCallsData({ peak, size } = {}) {
  pendingCallsSize = size || 0;
  document.querySelector('.calls-info .calls-size').innerHTML = size || 0;
  if (peak && peak.requestedAt) {
    document.querySelector('.calls-info .oldest-call').innerHTML =
      peak.requestedAt || 0;
  }
}

function onRoomCreated(call) {
  callId = call.id;
  const callFinishDelay = Math.ceil(Math.random() * 10000) || 3000;
  const callFinishingTimer = setTimeout(finishCall, callFinishDelay);
  setCallStatus(CALL_STATUSES.ON_CALL, call.requestedBy);
  socket.once(SOCKET_EVENTS.CALL_FINISED_BY_CUSTOMER, () => {
    clearTimeout(callFinishingTimer);
    makeOperatorIdle();
  });
}

function onCallAcceptingFailed(data) {
  console.error(
    `Call accepting by operator ${identity} failed: ${data.reason}`
  );
  setCallStatus(CALL_STATUSES.CALL_ACCEPTING_FAILED);
  setTimeout(makeOperatorIdle, 1000);
}

function finishCall() {
  socket.emit(SOCKET_EVENTS.CALL_FINISHED, callId);
  setCallStatus(CALL_STATUSES.IDLE);
  isOperatorOnCall = false;
}

function makeOperatorIdle() {
  isOperatorOnCall = false;
  setCallStatus(CALL_STATUSES.IDLE);
  acceptCallIfPossible();
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
