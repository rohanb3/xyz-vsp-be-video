/* eslint-disable no-console */
const { getNowSeconds, getUserNumber, toCamelCase } = require('./src/utils');
const { SOCKET_EVENTS, CALL_STATUSES, COLORS_MAP } = require('./src/constants');

const socketUrl = '/operators';

let socket = null;
const {
  userIdentity: identity,
  userType,
  minCallDuration,
  maxCallDuration,
  socketOptions,
  connectionDelay,
  acceptingLikelihood,
} = window;
const { statisticsCallbacks } = window.parent;

let isOperatorOnCall = false;
let pendingCallsSize = 0;

window.disconnectFromSocket = disconnectFromSocket;

let callId = null;
let startConnectingAt = null;
let connectedAt = null;
let startAuthorizingAt = null;
let authorizedAt = null;
let acceptedAtTime = null;
let roomCreatedAtTime = null;
let callAcceptionFailedAtTime = null;
let callFinishingTimer = null;

setCallStatus(CALL_STATUSES.UNAUTHORIZED);
connectToSocket();

function connectToSocket() {
  const userNumber = getUserNumber(identity);
  const connectDelay = userNumber * connectionDelay;
  setTimeout(() => {
    startConnectingAt = getNowSeconds();
    socket = window.io(socketUrl, {
      ...socketOptions,
      query: `identity=${identity}`,
    });

    socket.once(SOCKET_EVENTS.CONNECT, () => {
      const now = getNowSeconds();
      connectedAt = now;
      startAuthorizingAt = now;

      socket.emit(SOCKET_EVENTS.AUTHENTICATION, {
        identity,
        token: 'mocked-operator-user-token',
      });
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

function onAuthenticated() {
  authorizedAt = getNowSeconds();

  setAuthorizeStatus();
  statisticsCallbacks.decrementAuthorizingUsers(userType);
  statisticsCallbacks.incrementAuthenticatedUsers(userType);
  statisticsCallbacks.onUserAuthorized(
    userType,
    startAuthorizingAt,
    authorizedAt
  );
  socket.on(SOCKET_EVENTS.CALLS_CHANGED, onCallsChanged);
}

function setAuthorizeStatus() {
  setCallStatus(CALL_STATUSES.IDLE);
}

function setCallStatus(status = 'Idle') {
  const colorsMapKey = toCamelCase(status);
  document.body.style.backgroundColor = COLORS_MAP[colorsMapKey];
}

function onUnauthorized(error) {
  console.error(`Operator ${identity} was not authorized: ${error}`);
  setCallStatus(CALL_STATUSES.UNAUTHORIZED);
  statisticsCallbacks.decrementAuthorizingUsers(userType);
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
    !isOperatorOnCall &&
    pendingCallsSize &&
    Math.random() < acceptingLikelihood;
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
  socket.removeListener(
    SOCKET_EVENTS.CALL_ACCEPTING_FAILED,
    onCallAcceptingFailed
  );

  callId = call.id;
  roomCreatedAtTime = getNowSeconds();
  statisticsCallbacks.onCallAcceptionByOperatorHandled(
    call.id,
    acceptedAtTime,
    roomCreatedAtTime
  );

  if (Math.random() > 0.9) {
    const callDuration = Math.max(
      Math.ceil(Math.random() * maxCallDuration),
      minCallDuration
    );
    callFinishingTimer = setTimeout(finishCall, callDuration);
  }

  setCallStatus(CALL_STATUSES.ON_CALL);
  setPeerId(call.requestedBy);
  socket.once(SOCKET_EVENTS.CALL_FINISHED, onCallFinishedByCustomer);
}

function onCallAcceptingFailed(data) {
  socket.removeListener(SOCKET_EVENTS.ROOM_CREATED, onRoomCreated);
  callAcceptionFailedAtTime = getNowSeconds();
  statisticsCallbacks.onCallAcceptionByOperatorHandled(
    null,
    acceptedAtTime,
    callAcceptionFailedAtTime
  );
  console.error(
    `Call accepting by operator ${identity} failed: ${data.reason}`
  );
  setCallStatus(CALL_STATUSES.CALL_ACCEPTING_FAILED);
  setTimeout(makeOperatorIdle, 1000);
}

function finishCall() {
  socket.emit(SOCKET_EVENTS.CALL_FINISHED, callId);
  socket.removeListener(SOCKET_EVENTS.CALL_FINISHED, onCallFinishedByCustomer);
  makeOperatorIdle();
}

function onCallFinishedByCustomer() {
  clearTimeout(callFinishingTimer);
  makeOperatorIdle();
}

function makeOperatorIdle() {
  isOperatorOnCall = false;
  setPeerId();
  setCallStatus(CALL_STATUSES.IDLE);
  setTimeout(acceptCallIfPossible, 2000);
}

function setPeerId(idRaw) {
  if (idRaw) {
    const peerId = getUserNumber(idRaw);
    document.querySelector('.peer-id').innerHTML = `/${peerId}`;
  } else {
    document.querySelector('.peer-id').innerHTML = '';
  }
}

window.addEventListener('beforeunload', disconnectFromSocket);
