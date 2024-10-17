// Global test setup. Runs before each test.
// eslint-disable-next-line import/no-extraneous-dependencies
import sinon from 'sinon';
import { startNvim, stopNvim } from './testUtil';

export const mochaHooks = {
  beforeAll() {
    startNvim();
  },
  beforeEach() {
    sinon.restore();
  },
  afterAll() {
    stopNvim();
  },
};
