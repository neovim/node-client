const winston = require('winston');

let logger;

winston.level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

if (process.env.NVIM_NODE_LOG_FILE) {
  logger = new winston.Logger({
    transports: [
      new winston.transports.File({
        filename: process.env.NVIM_NODE_LOG_FILE,
        level: winston.level,
        json: false,
      }),
    ],
  });
} else {
  if (!process.env.ALLOW_CONSOLE) {
    // Remove Console transport
    winston.remove(winston.transports.Console);
  }
  logger = winston;
}

export { logger };
