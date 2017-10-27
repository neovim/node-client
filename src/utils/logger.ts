import * as winston from 'winston';

let logger: winston.LoggerInstance;

(<any>winston).level = process.env.NVIM_NODE_LOG_LEVEL || 'debug';
let transports = [];

if (process.env.NVIM_NODE_LOG_FILE) {
  transports.push(
    new winston.transports.File({
      filename: process.env.NVIM_NODE_LOG_FILE,
      level: winston.level,
      json: false,
    })
  );
}

if (process.env.ALLOW_CONSOLE) {
  transports.push(winston.transports.Console);
}

logger = new winston.Logger({
  level: process.env.NVIM_NODE_LOG_LEVEL || 'debug',
  transports,
});

export type ILogger = winston.LoggerInstance;
export { logger };
