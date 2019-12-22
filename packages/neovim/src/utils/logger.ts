import * as winston from 'winston';

const level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

const logger = winston.createLogger({
  level,
});

if (process.env.NVIM_NODE_LOG_FILE) {
  logger.add(
    new winston.transports.File({
      filename: process.env.NVIM_NODE_LOG_FILE,
      level,
    })
  );
}

if (process.env.ALLOW_CONSOLE) {
  logger.add(new winston.transports.Console());
}

export { logger };
