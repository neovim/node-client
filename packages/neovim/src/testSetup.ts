// Global test setup. Runs before each test.

import * as testUtil from './testUtil';
// import * as jest from '@jest/globals'

testUtil.findNvimOrFail();

// TODO: this doesn't work because jest sucks. use mocha instead.
// jest.beforeAll(() => {
// });
// jest.afterAll(() => {
// });
