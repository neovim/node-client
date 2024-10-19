process.env.NODE_ENV = 'test';

module.exports = {
  require: ['ts-node/register', 'src/testSetup.ts'],
  extension: ['ts'],
  spec: ['src/**/*.test.ts'],
  exit: true
}
