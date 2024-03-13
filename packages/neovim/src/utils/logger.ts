import * as winston from 'winston';

const level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

export type Logger = Pick<winston.Logger, 'info' | 'warn' | 'error' | 'debug'>;

function setupWinstonLogger(): Logger {
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
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  }

  if (!process.env.NVIM_NODE_LOG_FILE && !process.env.ALLOW_CONSOLE) {
    // Silent logger is necessary to avoid 'Attempt to write logs with no transports' error
    logger.add(new winston.transports.Console({ silent: true }));
  }

  // Monkey-patch `console` so that it does not write to the RPC (stdio) channel.
  Object.keys(console).forEach((k: keyof Console) => {
    (console as any)[k] = function () {
      (logger as any)[k === 'log' ? 'info' : k].apply(logger, arguments);
    };
  });

  return logger;
}

export const logger: Logger = setupWinstonLogger();
