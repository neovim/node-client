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

  // overrides: {
  // files: ['**/*.ts'],
  // rules: {
  // 'no-undef': 'off',

  // 'typescript/no-unused-vars': 1,

  // 'prefer-destructuring': 'off',

  // // https://github.com/eslint/typescript-eslint-parser/issues/414
  // 'no-restricted-globals': 'off',

  // // https://github.com/eslint/typescript-eslint-parser/issues/434
  // 'no-dupe-class-members': 'off',

  // 'no-use-before-define': 'off',
  // },
  // },

  rules: {
    camelcase: ['error', { properties: 'never' }],
    'class-methods-use-this': 0,
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
    'no-underscore-dangle': 0,
    'no-mixed-operators': 0,
    'func-names': 0,

    // prettier things
    'prettier/prettier': 'error',
    // 'arrow-parens': 0,
    // 'space-before-function-paren': 0,

    'import/extensions': 0,
    'import/prefer-default-export': 0,

    '@typescript-eslint/no-explicit-any': ['off'],
  },

  settings: {
    'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts'] } },
  },
};
