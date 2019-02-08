const promiser = (resolve, reject) => (err, data) => (err ? reject(err) : resolve(data));
const reduceToKey = (...args) => args.join(':');

exports.promiser = promiser;
exports.reduceToKey = reduceToKey;
