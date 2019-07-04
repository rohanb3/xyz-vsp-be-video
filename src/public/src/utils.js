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

module.exports = {
  getDefaultStatistics,
  getDefaultCall,
};
