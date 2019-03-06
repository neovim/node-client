module.exports = {
  // extending prettier fucks up my vim...
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  plugins: ['import', 'prettier', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },

  rules: {
    camelcase: ['error', { properties: 'never' }],
    'class-methods-use-this': 'off',
    'comma-dangle': [
      'error',
      {
        arrays: 'only-multiline',
        objects: 'only-multiline',
        imports: 'only-multiline',
        exports: 'only-multiline',
        functions: 'ignore',
      },
    ],
    'no-case-declarations': 'off',
    'no-prototype-builtins': 'off',
    'no-underscore-dangle': 'off',
    'no-mixed-operators': 'off',
    'func-names': 'off',

    // prettier things
    'prettier/prettier': 'error',

    'import/extensions': 'off',
    'import/prefer-default-export': 'off',

    '@typescript-eslint/no-explicit-any': ['off'],
  },

  settings: {
    'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts'] } },
  },
};
