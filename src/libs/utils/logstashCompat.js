const { clone } = require('winston-compat');
const cycle = require('cycle');
const ansiRegex = require('ansi-regex');

function log(options) {
  let meta = options.meta !== null && options.meta !== undefined && !(options.meta instanceof Error)
    ? clone(cycle.decycle(options.meta))
    : options.meta || null;

  if (typeof meta !== 'object' && meta != null) {
    meta = { meta };
  }
  const output = clone(meta) || {};

  output.level = options.level;
  output.message = options.message.stripColors ? options.message.stripColors : options.message;

  const {
    timestamp, level, message, label: filePath,
  } = meta;
  const { node_name: nodeName } = options;
  const levelWithoutANSI = level.replace(ansiRegex(), '').toUpperCase();

  return `[${timestamp}][${levelWithoutANSI}][${nodeName}][${filePath} --> ${message}]`;
}

exports.log = log;
exports.clone = clone;
