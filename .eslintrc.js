module.exports = {
  // extending prettier fucks up my vim...
  extends: ['airbnb-base'],
  parser: 'typescript-eslint-parser',
  plugins: ['typescript', 'import'],
  rules: {
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
