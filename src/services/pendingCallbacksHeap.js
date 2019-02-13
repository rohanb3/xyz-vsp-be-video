const { createHeap } = require('@/services/heap');
const { CALLBACKS_PENDING } = require('@/constants/calls');

const pendingCallbacksHeap = createHeap(CALLBACKS_PENDING);

module.exports = pendingCallbacksHeap;
