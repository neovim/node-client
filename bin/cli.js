#!/usr/bin/env node
const Host = require('../src/host');
const logger = require('../src/logger');

// node <current script> <rest of args>
const [, , ...args] = process.argv;

try {
  const host = new Host(args);
  host.start({ proc: process });
} catch (err) {
  logger.error(err);
}

process.on('unhandledRejection', (reason, p) => {
  logger.info('Unhandled Rejection at:', p, 'reason:', reason);
});
