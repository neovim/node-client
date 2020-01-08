import * as winston from 'winston';

const level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

const winstonLogger = winston.createLogger({
  level,
});

if (process.env.NVIM_NODE_LOG_FILE) {
  winstonLogger.add(
    new winston.transports.File({
      filename: process.env.NVIM_NODE_LOG_FILE,
      level,
    })
  );
}

if (process.env.ALLOW_CONSOLE) {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export type Logger = Pick<winston.Logger, 'info' | 'warn' | 'error' | 'debug'>;
export const logger: Logger = winstonLogger;
