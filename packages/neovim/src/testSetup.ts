// Global test setup. Runs before each test.
import { startNvim, stopNvim } from './testUtil';

process.env.NODE_ENV = 'test';

export const mochaHooks = {
  beforeAll: async () => {
    startNvim();
  },
  afterAll: () => {
    stopNvim();
  },
};
