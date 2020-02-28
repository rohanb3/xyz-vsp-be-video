const { createHeap, getErrors } = require('@/services/heap');
const { USERS_CONNECTIONS_HEAP } = require('@/constants/common');
const logger = require('@/services/logger')(module);

const connectionsHeap = createHeap(USERS_CONNECTIONS_HEAP);
const errors = getErrors();

connectionsHeap.subscribeToItemAdding((...args) => logger.debug('connectionsHead.itemAdded', ...args));
connectionsHeap.subscribeToItemTaking((...args) => logger.debug('connectionsHead.itemRemoved', ...args));

exports.connectionsHeap = connectionsHeap;
exports.errors = errors;
