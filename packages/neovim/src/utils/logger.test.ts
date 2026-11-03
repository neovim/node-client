import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import expect from 'expect';

describe('logger', () => {
  it('$ALLOW_CONSOLE writes to stderr, not stdout', () => {
    // Needs a new process: the logger is a singleton configured from env vars at load-time.
    const script = [
      "const logger = require('./src/utils/logger').getLogger();",
      "logger.error('test-error');",
      "logger.warn('test-warn');",
      "logger.info('test-info');",
      "logger.debug('test-debug');",
      "console.log('test-console-log');",
    ].join('\n');
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: 'true',
      ALLOW_CONSOLE: '1',
      NVIM_NODE_LOG_LEVEL: 'debug',
    };
    delete env.NVIM_NODE_LOG_FILE;
    const result = spawnSync(process.execPath, ['-r', 'ts-node/register', '-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      env,
      encoding: 'utf8',
    });

    expect(result.status).toEqual(0);
    expect(result.stdout).toEqual('');
    for (const msg of ['test-error', 'test-warn', 'test-info', 'test-debug', 'test-console-log']) {
      expect(result.stderr).toContain(msg);
    }
  }).timeout(30000);
});
