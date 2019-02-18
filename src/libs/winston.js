/* eslint-disable no-param-reassign */
const { createLogger, format, transports } = require('winston');
const { SPLAT } = require('triple-beam');

const {
  combine,
  timestamp,
  printf,
  colorize,
  align,
  label,
} = format;

const options = {
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

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

const customFormat = printf(info => (
  `\n ${info.timestamp} [${info.label}] ${info.level}: ${info.message} \n`
));

const getLogger = (module) => {
  const path = module.filename.split('/').slice(-2).join('/');

  const logger = createLogger({
    transports: [
      new transports.Console(options.console),
    ],
    format: combine(
      all(),
      label({ label: path }),
      colorize(),
      timestamp(),
      align(),
      customFormat,
    ),
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test',
  });

  logger.stream = {
    write(message) {
      logger.info(message);
    },
  };

  return logger;
};

module.exports = getLogger;
