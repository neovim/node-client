module.exports = {
  // extending prettier fucks up my vim...
  extends: ['airbnb-base', 'prettier'],
  plugins: ['import'],
  overrides: {
    files: ['**/*.ts'],
    parser: 'typescript-eslint-parser',
    plugins: ['typescript'],
    rules: {
      'no-undef': 'off',

      'typescript/no-unused-vars': 1,

      'prefer-destructuring': 'off',

      // https://github.com/eslint/typescript-eslint-parser/issues/414
      'no-restricted-globals': 'off',

      // https://github.com/eslint/typescript-eslint-parser/issues/434
      'no-dupe-class-members': 'off',

      'no-use-before-define': 'off',
    },
  },

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
    'arrow-parens': 0,
    'space-before-function-paren': 0,

    'import/extensions': 0,
    'import/prefer-default-export': 0,
  },

  settings: {
    'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts'] } },
    'import/parsers': {
      'typescript-eslint-parser': ['.ts', '.tsx'],
    },
  },
};
