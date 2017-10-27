import * as winston from 'winston';

let logger: winston.LoggerInstance;

const logLevel = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

if (process.env.NVIM_NODE_LOG_FILE) {
  logger = new winston.Logger({
    transports: [
      new winston.transports.File({
        filename: process.env.NVIM_NODE_LOG_FILE,
        level: logLevel,
        json: false,
      }),
    ],
  });
} else {
  logger = new winston.Logger({ level: logLevel });
  if (process.env.ALLOW_CONSOLE) {
    logger.add(winston.transports.Console);
  }
}

export type ILogger = winston.LoggerInstance;
export { logger };
