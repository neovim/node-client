const { NVIM_DEV_MODE } = require('./properties');

module.exports = (cls) => {
  Object.defineProperty(cls, NVIM_DEV_MODE, { value: true });
};
