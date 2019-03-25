module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: '8.15.1' } }],
    '@babel/preset-typescript',
  ],
  plugins: ['@babel/plugin-proposal-class-properties'],

  env: {
    test: {},
  },
};
