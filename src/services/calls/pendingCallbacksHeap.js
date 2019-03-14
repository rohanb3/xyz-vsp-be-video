const { createHeap, getErrors } = require('@/services/heap');
const { CALLBACKS_PENDING } = require('@/constants/calls');

const pendingCallbacksHeap = createHeap(CALLBACKS_PENDING);
const errors = getErrors();

exports.pendingCallbacksHeap = pendingCallbacksHeap;
exports.errors = errors;
