(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{"./src/constants":2,"./src/utils":3}],2:[function(require,module,exports){
const QUEUE = 'queue';
const CUSTOMERS = 'customers';
const OPERATORS = 'operators';
const CALLS = 'calls';
const TOTAL = 'total';
const CONNECTING = 'connecting';
const CONNECTED = 'connected';
const AUTHORIZING = 'authorizing';
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
const REQUESTED_AT = 'requestedAt';
const ENQUEUED_AT = 'enqueuedAt';
const ACCEPTED_AT = 'acceptedAt';
const ACCEPTED_AT_RAW = 'acceptedAtRaw';
const ENQUEUED_IN = 'enqueuedIn';
const WRAPPING_UP_CUSTOMER = 'wrappingUpCustomer';
const WRAPPING_UP_OPERATOR = 'wrappingUpOperator';
const READY_FOR_CUSTOMER_AT = 'readyForCustomerAt';
const READY_FOR_CUSTOMER_AT_RAW = 'readyForCustomerAtRaw';
const READY_FOR_OPERATOR_AT = 'readyForOperatorAt';
const CONNECTION_TO_CALL_CUSTOMER = 'connectionToCallCustomer';
const CONNECTION_TO_CALL_OPERATOR = 'connectionToCallOperator';
const MIN_CONNECTING_TIME = 'minConnectingTime';
const MAX_CONNECTING_TIME = 'maxConnectingTime';
const AVERAGE_CONNECTING_TIME = 'averageConnectingTime';
const MIN_AUTHORIZING_TIME = 'minAuthorizingTime';
const MAX_AUTHORIZING_TIME = 'maxAuthorizingTime';
const AVERAGE_AUTHORIZING_TIME = 'averageAuthorizingTime';
const TOTAL_CONNECTING_TIME = 'totalConnectingTime';
const TOTAL_AUTHORIZING_TIME = 'totalAuthorizingTime';
const MIN_CONNECTING_TO_CALL_TIME = 'minConnectingToCallTime';
const MAX_CONNECTING_TO_CALL_TIME = 'maxConnectingToCallTime';
const AVERAGE_CONNECTING_TO_CALL_TIME = 'averageConnectingToCallTime';

module.exports.TYPES = {
  QUEUE,
  CUSTOMERS,
  OPERATORS,
  CALLS,
};

module.exports.FIELDS = {
  TOTAL,
  CONNECTING,
  CONNECTED,
  AUTHORIZING,
  AUTHENTICATED,
  UNAUTHORIZED,
  WAITING_FOR_QUEUE_CALLS,
  PENDING_CALLS,
  NOT_ENQUEUED_CALLS,
  ACTIVE_CALLS,
  MAX_ACTIVE_CALLS,
  FINISHED_CALLS,
  MISSED_CALLS,
  TOTAL_CALLS,
  PENDING_IN_QUEUE,
  OLDEST_IN_QUEUE,
  MIN_ENQUEUEING_TIME,
  MAX_ENQUEUEING_TIME,
  AVERAGE_ENQUEUEING_TIME,
  MIN_ACCEPTING_TIME,
  MAX_ACCEPTING_TIME,
  AVERAGE_ACCEPTING_TIME,
  MIN_DURATION,
  MAX_DURATION,
  AVERAGE_DURATION,
  TOTAL_DURATION,
  MAX_IN_QUEUE,
  REQUESTED_AT,
  ENQUEUED_AT,
  ENQUEUED_IN,
  WRAPPING_UP_CUSTOMER,
  WRAPPING_UP_OPERATOR,
  ACCEPTED_AT,
  ACCEPTED_AT_RAW,
  READY_FOR_CUSTOMER_AT,
  READY_FOR_CUSTOMER_AT_RAW,
  READY_FOR_OPERATOR_AT,
  CONNECTION_TO_CALL_CUSTOMER,
  CONNECTION_TO_CALL_OPERATOR,
  MIN_CONNECTING_TIME,
  MAX_CONNECTING_TIME,
  AVERAGE_CONNECTING_TIME,
  TOTAL_CONNECTING_TIME,
  MIN_AUTHORIZING_TIME,
  MAX_AUTHORIZING_TIME,
  AVERAGE_AUTHORIZING_TIME,
  TOTAL_AUTHORIZING_TIME,
  MIN_CONNECTING_TO_CALL_TIME,
  MAX_CONNECTING_TO_CALL_TIME,
  AVERAGE_CONNECTING_TO_CALL_TIME,
};

module.exports.DEFAULT_STATISTICS = {
  [QUEUE]: {
    [PENDING_IN_QUEUE]: 0,
    [OLDEST_IN_QUEUE]: 0,
    [MAX_IN_QUEUE]: 0,
  },
  [CUSTOMERS]: {
    [TOTAL]: 0,
    [CONNECTING]: 0,
    [CONNECTED]: 0,
    [AUTHORIZING]: 0,
    [AUTHENTICATED]: 0,
    [UNAUTHORIZED]: 0,
    [MIN_CONNECTING_TIME]: Infinity,
    [MAX_CONNECTING_TIME]: 0,
    [AVERAGE_CONNECTING_TIME]: 0,
    [TOTAL_CONNECTING_TIME]: 0,
    [MIN_AUTHORIZING_TIME]: Infinity,
    [MAX_AUTHORIZING_TIME]: 0,
    [AVERAGE_AUTHORIZING_TIME]: 0,
    [TOTAL_AUTHORIZING_TIME]: 0,
    [WAITING_FOR_QUEUE_CALLS]: 0,
    [NOT_ENQUEUED_CALLS]: 0,
    [PENDING_CALLS]: 0,
    [ACTIVE_CALLS]: 0,
    [MAX_ACTIVE_CALLS]: 0,
    [FINISHED_CALLS]: 0,
    [MISSED_CALLS]: 0,
    [TOTAL_CALLS]: 0,
    [MIN_ENQUEUEING_TIME]: Infinity,
    [MAX_ENQUEUEING_TIME]: 0,
    [AVERAGE_ENQUEUEING_TIME]: 0,
    [MIN_ACCEPTING_TIME]: Infinity,
    [MAX_ACCEPTING_TIME]: 0,
    [AVERAGE_ACCEPTING_TIME]: 0,
    [MIN_DURATION]: Infinity,
    [MAX_DURATION]: 0,
    [AVERAGE_DURATION]: 0,
    [TOTAL_DURATION]: 0,
    [MIN_CONNECTING_TO_CALL_TIME]: Infinity,
    [MAX_CONNECTING_TO_CALL_TIME]: 0,
    [AVERAGE_CONNECTING_TO_CALL_TIME]: 0,
  },
  [OPERATORS]: {
    [TOTAL]: 0,
    [CONNECTING]: 0,
    [CONNECTED]: 0,
    [AUTHORIZING]: 0,
    [AUTHENTICATED]: 0,
    [UNAUTHORIZED]: 0,
    [MIN_CONNECTING_TIME]: Infinity,
    [MAX_CONNECTING_TIME]: 0,
    [AVERAGE_CONNECTING_TIME]: 0,
    [TOTAL_CONNECTING_TIME]: 0,
    [MIN_AUTHORIZING_TIME]: Infinity,
    [MAX_AUTHORIZING_TIME]: 0,
    [AVERAGE_AUTHORIZING_TIME]: 0,
    [TOTAL_AUTHORIZING_TIME]: 0,
    [ACTIVE_CALLS]: 0,
    [FINISHED_CALLS]: 0,
    [MIN_ACCEPTING_TIME]: Infinity,
    [MAX_ACCEPTING_TIME]: 0,
    [AVERAGE_ACCEPTING_TIME]: 0,
    [TOTAL_CALLS]: 0,
  },
  [CALLS]: {},
};

module.exports.SOCKET_EVENTS = {
  CONNECT: 'connect',
  AUTHENTICATION: 'authentication',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  CALLS_CHANGED: 'calls.changed',
  CALL_REQUESTED: 'call.requested',
  CALL_ENQUEUED: 'call.enqueued',
  CALL_NOT_ENQUEUED: 'call.not.enqueued',
  CALL_ACCEPTED: 'call.accepted',
  CALL_FINISHED: 'call.finished',
  CALLBACK_REQUESTED: 'callback.requested',
  CALLBACK_REQUESTING_FAILED: 'callback.requesting.failed',
  CALLBACK_ACCEPTED: 'callback.accepted',
  CALLBACK_DECLINED: 'callback.declined',
  ROOM_CREATED: 'room.created',
  CALLS_EMPTY: 'calls.empty',
  CALL_ACCEPTING_FAILED: 'call.accepting.failed',
};

module.exports.CALL_STATUSES = {
  IDLE: 'Idle',
  CALL_REQUESTED: 'Call requested',
  CALL_ENQUEUED: 'Call enqueued',
  CALL_NOT_ENQUEUED: 'Call not enqueued',
  CALL_ACCEPTED: 'Call accepted',
  CALL_ACCEPTING_FAILED: 'Call accepting failed',
  ON_CALL: 'On call',
  UNAUTHORIZED: 'Unauthorized',
};

module.exports.APP_MODES = {
  FULL: '1',
  STEPS_BY_STEP: '2',
};

module.exports.COLORS_MAP = {
  idle: '#CFD8DC',
  callRequested: '#C5CAE9',
  callEnqueued: '#FFF9C4',
  callNotEnqueued: '#ffcdd2',
  callAccepted: '#FFF9C4',
  callAcceptingFailed: '#ffcdd2',
  onCall: '#C8E6C9',
  unauthorized: '#B0BEC5',
};

},{}],3:[function(require,module,exports){
/* eslint-disable no-console */
const { DEFAULT_STATISTICS, TYPES, FIELDS } = require('./constants');

const { QUEUE, CUSTOMERS, OPERATORS, CALLS } = TYPES;

function getDefaultStatistics() {
  return {
    [QUEUE]: { ...DEFAULT_STATISTICS[QUEUE] },
    [CUSTOMERS]: { ...DEFAULT_STATISTICS[CUSTOMERS] },
    [OPERATORS]: { ...DEFAULT_STATISTICS[OPERATORS] },
    [CALLS]: { ...DEFAULT_STATISTICS[CALLS] },
  };
}

function getDefaultCall() {
  return {
    [FIELDS.REQUESTED_AT]: null,
    [FIELDS.ENQUEUED_AT]: null,
    [FIELDS.ACCEPTED_AT]: null,
    [FIELDS.READY_FOR_CUSTOMER_AT]: null,
    [FIELDS.READY_FOR_OPERATOR_AT]: null,
  };
}

function incrementField(statistics, userType, field, value = 1) {
  try {
    statistics[userType][field] += value;
  } catch (e) {
    console.error(`Field ${field} cannot be incremented for ${userType}: ${e}`);
  }
}

function decrementField(statistics, userType, field) {
  try {
    statistics[userType][field] -= 1;
  } catch (e) {
    console.error(`Field ${field} cannot be decremented for ${userType}: ${e}`);
  }
}

function setField(statistics, userType, field, value) {
  try {
    statistics[userType][field] = value;
  } catch (e) {
    console.error(
      `Field ${field} cannot be set for ${userType} with ${value}: ${e}`
    );
  }
}

function getField(statistics, userType, field) {
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

function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/\s[a-z]/g, match => match.trim().toUpperCase());
}

function getUserNumber(id = '') {
  return Number(id.match(/[0-9]*$/)[0]);
}

function getNowSeconds() {
  return Date.now() / 1000;
}

module.exports = {
  getDefaultStatistics,
  getDefaultCall,
  incrementField,
  decrementField,
  setField,
  getField,
  toCamelCase,
  getUserNumber,
  getNowSeconds,
};

},{"./constants":2}]},{},[1]);
