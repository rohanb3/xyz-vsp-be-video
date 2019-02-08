const serialize = value => JSON.stringify(value);
const deserialize = string => JSON.parse(string);

exports.serialize = serialize;
exports.deserialize = deserialize;
