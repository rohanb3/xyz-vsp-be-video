const { createHeap, getErrors } = require('@/services/heap');
const { OPERATORS } = require('@/constants/rooms');
const {
  OperatorsChangesEmitter,
} = require('@/services/operators/changesEmitter');
const { reduceToKey } = require('@/services/redisUtils');

const operatorsChangesEmitter = new OperatorsChangesEmitter();

const operatorsHeaps = {};
const errors = getErrors();

const heapsChangesEventEmit = tenantId => data =>
  operatorsChangesEmitter.emit('operatorsHeapsChanged', {
    data,
    tenantId,
  });

function getOperatorsHeap(tenantId) {
  const heapName = reduceToKey(OPERATORS, tenantId);

  if (!operatorsHeaps[heapName]) {
    operatorsHeaps[heapName] = createHeap(heapName);
    operatorsHeaps[heapName].subscribeToHeapChanged(
      heapsChangesEventEmit(tenantId)
    );
  }

  return operatorsHeaps[heapName];
}

function subscribeOnHeapChanges(listener) {
  operatorsChangesEmitter.on('operatorsHeapsChanged', listener);
}

function unsubscribeFromHeapChanging(listener) {
  operatorsChangesEmitter.removeListener('operatorsHeapsChanged', listener);
}

exports.getOperatorsHeap = getOperatorsHeap;
exports.subscribeOnHeapChanges = subscribeOnHeapChanges;
exports.unsubscribeFromHeapChanging = unsubscribeFromHeapChanging;

exports.errors = errors;
