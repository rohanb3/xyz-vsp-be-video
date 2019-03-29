/* eslint-disable no-param-reassign */
const winston = require('winston');
const { SPLAT } = require('triple-beam');
const common = require('winston/lib/winston/common');
require('winston-logstash');
const config = require('config');
const { clone, log } = require('./utils/logstashCompat');

winston.clone = clone;
common.log = log;

const { createLogger, format, transports } = winston;
const consoleEnbled = config.get('console.enabled');
const {
  enabled: logstashEnabled, port, host, node_name: nodeName,
} = config.get('logstash');

const {
  combine, timestamp, printf, colorize, align, label,
} = format;

const options = {
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
    silent: !consoleEnbled,
  },
};

if (logstashEnabled) {
  options.logstash = {
    port,
    host,
    node_name: nodeName,
  };
}

const isObject = (value) => {
  const type = typeof value;
  return value != null && (type === 'object' || type === 'function');
};

const formatObject = (param) => {
  if (isObject(param)) {
    return JSON.stringify(param);
  }
  return param;
};

const all = format((info) => {
  const splat = info[SPLAT] || [];
  const message = formatObject(info.message);
  const rest = splat.map(formatObject).join(' ');
  info.message = `${message} ${rest}`;
  return info;
});

const customFormat = printf(
  info => `\n ${info.timestamp} [${info.label}] ${info.level}: ${info.message} \n`,
);

const loggerTransports = [new transports.Console(options.console)];

if (logstashEnabled) {
  loggerTransports.push(new transports.Logstash(options.logstash));
}

const getLogger = (module) => {
  const path = module.filename
    .split('/')
    .slice(-2)
    .join('/');

  const logger = createLogger({
    transports: loggerTransports,
    format: combine(all(), label({ label: path }), colorize(), timestamp(), align(), customFormat),
    level: 'debug',
    exitOnError: false,
  });

  logger.stream = {
    write(message) {
      logger.info(message);
    },
  };

  return logger;
};

module.exports = getLogger;
