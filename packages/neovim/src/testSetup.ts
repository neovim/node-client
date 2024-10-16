// Global test setup. Runs before each test.
import { startNvim, stopNvim } from './testUtil';

export const mochaHooks = {
  beforeAll: async () => {
    startNvim();
  },
  afterAll: () => {
    stopNvim();
  },
};
