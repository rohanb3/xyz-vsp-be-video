const { createHeap } = require('@/services/heap');
const { CALLS_ACTIVE } = require('@/constants/calls');

const activeCallsHeap = createHeap(CALLS_ACTIVE);

module.exports = activeCallsHeap;
