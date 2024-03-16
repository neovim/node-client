// Global test setup. Runs before each test.

import * as testUtil from './testUtil';
import * as jest from '@jest/globals'

testUtil.findNvimOrFail();

let proc: ReturnType<typeof testUtil.startNvim>[0];
let nvim: ReturnType<typeof testUtil.startNvim>[1];

/**
 * Gets the current Nvim client being used in the current test.
 */
export function getNvim() {
  return nvim!;
}

export function getNvimProc() {
  return proc!;
}

jest.beforeAll(() => {
  const testName = jest.expect.getState().testPath;
  console.log('xxxxxxxxxxxx BEFORE %O', testName);
  [proc, nvim] = testUtil.startNvim(true);
});

jest.afterAll(() => {
  const testName = jest.expect.getState().currentTestName;
  console.log('xxxxxxxxxxxx AFTER %O', testName);
  testUtil.stopNvim(proc);
  testUtil.stopNvim(nvim);
  proc = undefined;
  nvim = undefined;
});
