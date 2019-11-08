const { callTypes } = require('@/constants/calls');

exports.rateValidator = value => !value || (value >= 1 && value <= 5);

exports.callTypeValidator = value => Object.values(callTypes).includes(value);
