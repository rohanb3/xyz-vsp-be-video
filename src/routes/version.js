const pkg = require('../../package.json');

const getVersion = (req, res) =>
  res.status(200).send(JSON.stringify({ apiVersion: pkg.version }));

exports.getVersion = getVersion;
