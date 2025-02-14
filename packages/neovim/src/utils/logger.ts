import * as winston from 'winston';
import { inspect } from 'node:util';

const level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';

const loggerKeys = ['info', 'warn', 'error', 'debug', 'level'] as const;
export type Logger = Pick<winston.Logger, (typeof loggerKeys)[number]>;

function getFormat(colorize: boolean) {
  return winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(info => {
      let msg: string;
      try {
        msg =
          typeof info.message === 'object'
            ? inspect(info.message, false, 2, colorize)
            : info.message;
      } catch {
        msg = info.message;
      }
      const lvl = info.level === 'debug' ? 'DBG' : info.level.slice(0, 3).toUpperCase();
      return `${info.timestamp} ${lvl} ${msg}`;
    })
  );
}

function setupWinstonLogger(): Logger {
  const logger = winston.createLogger({
    level,
  });

  if (process.env.NVIM_NODE_LOG_FILE) {
    logger.add(
      new winston.transports.File({
        filename: process.env.NVIM_NODE_LOG_FILE,
        level,
        format: getFormat(false),
      })
    );
  }

  if (process.env.ALLOW_CONSOLE) {
    logger.add(
      new winston.transports.Console({
        format: getFormat(true),
      })
    );
  }

  if (!process.env.NVIM_NODE_LOG_FILE && !process.env.ALLOW_CONSOLE) {
    // Silent logger is necessary to avoid 'Attempt to write logs with no transports' error
    logger.add(new winston.transports.Console({ silent: true }));
  }

  // Monkey-patch `console` so that it does not write to the RPC (stdio) channel.
  Object.keys(console).forEach((k: string) => {
    const loggerKey = k === 'log' ? 'info' : k;
    if (k === 'assert') {
      // XXX: support console.assert() even though our logger doesn't define it.
      // eslint-disable-next-line no-console
      console.assert = function (condition?: boolean | undefined, ...data: any[]) {
        if (!condition) {
          logger.error('assertion failed', ...data);
        }
      };
    } else if (loggerKeys.includes(loggerKey as any)) {
      (console as any)[k] = function (...args: any[]) {
        const loggerFn = (logger as any)[loggerKey];
        loggerFn.apply(logger, args);
      };
    }
  });

  return logger;
}

let _logger: Logger; // singleton
export function getLogger() {
  if (!_logger) {
    _logger = setupWinstonLogger();
  }
  return _logger;
}
