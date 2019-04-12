const { createHeap, getErrors } = require('@/services/heap');
const { USERS_CONNECTIONS_HEAP } = require('@/constants/common');

const connectionsHeap = createHeap(USERS_CONNECTIONS_HEAP);
const errors = getErrors();

exports.connectionsHeap = connectionsHeap;
exports.errors = errors;
