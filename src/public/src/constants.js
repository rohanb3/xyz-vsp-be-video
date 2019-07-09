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
