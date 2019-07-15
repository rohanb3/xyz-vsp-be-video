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
