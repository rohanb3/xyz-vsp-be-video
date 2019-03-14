const { createHeap, getErrors } = require('@/services/heap');
const { CALLS_ACTIVE } = require('@/constants/calls');

const activeCallsHeap = createHeap(CALLS_ACTIVE);
const errors = getErrors();

exports.activeCallsHeap = activeCallsHeap;
exports.errors = errors;
