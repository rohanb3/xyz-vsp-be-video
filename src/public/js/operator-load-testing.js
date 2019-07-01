(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* eslint-disable no-console */

const socketUrl = '/operators';

let socket = null;
const {
  userIdentity: identity,
  userType,
  minCallDuration,
  maxCallDuration,
  socketOptions,
  connectionDelay,
} = window;
const { statisticsCallbacks } = window.parent;

let isOperatorOnCall = false;
let pendingCallsSize = 0;

window.disconnectFromSocket = disconnectFromSocket;

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
let acceptedAtTime = null;
let roomCreatedAtTime = null;
let callAcceptionFailedAtTime = null;

setCallStatus(CALL_STATUSES.UNAUTHORIZED);
connectToSocket();

function connectToSocket() {
  const userNumber = getUserNumber(identity);
  const connectDelay = userNumber * connectionDelay;
  setTimeout(() => {
    socket = window.io(socketUrl, socketOptions);

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      socket.emit(SOCKET_EVENTS.AUTHENTICATION, { identity });
      socket.on(SOCKET_EVENTS.AUTHENTICATED, onAuthenticated);
      socket.on(SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);
    });
  }, connectDelay);
}

function onAuthenticated() {
  setAuthorizeStatus();
  statisticsCallbacks.incrementAuthenticatedUsers(userType);
  socket.on(SOCKET_EVENTS.CALLS_CHANGED, onCallsChanged);
}

function setAuthorizeStatus() {
  setCallStatus(CALL_STATUSES.IDLE);
}

function setCallStatus(status = 'Idle') {
  const colorsMapKey = toCamelCase(status);
  document.body.style.backgroundColor = colorsMap[colorsMapKey];
}

function onUnauthorized(error) {
  console.error(`Operator ${identity} was not authorized: ${error}`);
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
  acceptedAtTime = getNowSeconds();
  statisticsCallbacks.incrementOperatorsAcceptedCalls();
  setCallStatus(CALL_STATUSES.CALL_ACCEPTED);
  socket.emit(SOCKET_EVENTS.CALL_ACCEPTED);
  socket.once(SOCKET_EVENTS.ROOM_CREATED, onRoomCreated);
  socket.once(SOCKET_EVENTS.CALL_ACCEPTING_FAILED, onCallAcceptingFailed);
}

function updatePendingCallsData({ size } = {}) {
  pendingCallsSize = size || 0;
}

function onRoomCreated(call) {
  let callFinishingTimer = null;

  callId = call.id;
  roomCreatedAtTime = getNowSeconds();
  statisticsCallbacks.updateCallAcceptingTime(roomCreatedAtTime - acceptedAtTime);

  if (Math.random() > 0.9) {
    const callDuration = Math.max(Math.ceil(Math.random() * maxCallDuration), minCallDuration);
    callFinishingTimer = setTimeout(finishCall, callDuration);
  }

  setCallStatus(CALL_STATUSES.ON_CALL);
  setPeerId(call.requestedBy);
  socket.once(SOCKET_EVENTS.CALL_FINISHED, () => {
    clearTimeout(callFinishingTimer);
    makeOperatorIdle();
  });
}

function onCallAcceptingFailed(data) {
  callAcceptionFailedAtTime = getNowSeconds();
  statisticsCallbacks.updateCallAcceptingTime(callAcceptionFailedAtTime - acceptedAtTime);
  console.error(
    `Call accepting by operator ${identity} failed: ${data.reason}`
  );
  setCallStatus(CALL_STATUSES.CALL_ACCEPTING_FAILED);
  setTimeout(makeOperatorIdle, 1000);
}

function finishCall() {
  socket.emit(SOCKET_EVENTS.CALL_FINISHED, callId);
  makeOperatorIdle();
}

function makeOperatorIdle() {
  isOperatorOnCall = false;
  setPeerId();
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

},{}]},{},[1]);
