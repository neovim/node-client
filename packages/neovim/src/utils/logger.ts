import * as winston from 'winston';

const transports = [];
const level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

if (process.env.NVIM_NODE_LOG_FILE) {
  transports.push(
    new winston.transports.File({
      filename: process.env.NVIM_NODE_LOG_FILE,
      level,
    })
  );
}

if (process.env.ALLOW_CONSOLE) {
  transports.push(winston.transports.Console);
}

const logger = winston.createLogger({
  level,
  transports,
});

export { logger };
