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
    'max-classes-per-file': 'off',

    // For overloading (and typescript throws when dupe members anyway)
    'no-dupe-class-members': 'off',

    // Causes issues with enums
    'no-shadow': 'off',

    // prettier things
    'prettier/prettier': 'error',

    'import/extensions': 'off',
    'import/prefer-default-export': 'off',

    '@typescript-eslint/no-explicit-any': ['off'],
    '@typescript-eslint/explicit-member-accessibility': ['off'],
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-empty-function': ['off'],
    '@typescript-eslint/explicit-function-return-type': ['off'],
  },

  settings: {
    'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts'] } },
  },
};
