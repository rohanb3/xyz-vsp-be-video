const { createLogger, format, transports } = require('winston');

const {
  combine,
  timestamp,
  printf,
  colorize,
} = format;

const options = {
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

const customFormat = printf(info => (
  `${info.timestamp} ${info.level}: ${info.message}`
));

const logger = createLogger({
  transports: [
    new transports.Console(options.console),
  ],
  format: combine(
    timestamp(),
    colorize(),
    customFormat,
  ),
  exitOnError: false,
});

logger.stream = {
  write(message) {
    logger.info(message);
  },
};

module.exports = logger;
