const pkg = require('../../package.json');

const getVersion = (req, res) =>
  res.status(200).send(JSON.stringify({ serviceVersion: pkg.version }));

exports.getVersion = getVersion;
