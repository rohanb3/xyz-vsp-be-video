const { APP_NAME } = require('../constants/app');

const promiser = (resolve, reject) => (err, data) => (err ? reject(err) : resolve(data));
const reduceToKey = (...args) => [APP_NAME, ...args].join(':');

exports.promiser = promiser;
exports.reduceToKey = reduceToKey;
