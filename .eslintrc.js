/**
 * @type {import('eslint').Linter.LegacyConfig}
 */
module.exports = {
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['unicorn', 'import', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  reportUnusedDisableDirectives: true,
  ignorePatterns: [
    '.eslintrc.js',
    'packages/*/lib/',
    'packages/*/bin/',
    'packages/neovim/scripts/',
    'packages/integration-tests/__tests__/',
    'examples/rplugin/node/',
    'packages/example-plugin/',
    'packages/example-plugin-decorators/',
  ],
  env: {
    node: true,
    es2024: true,
    mocha: true,
  },

  overrides: [
    {
      files: ['*.test.ts'],
      // excludedFiles: ['bin/*.ts', 'lib/*.ts'],
      rules: {
        // This rule requires es2022(?) but the CI node14 job runs the tests
        // in node14, but the test code is not compiled/polyfilled... so the
        // test code needs to be compatible with node14.
        // TODO: can the back-compat CI jobs for older node.js versions run
        // `jest` against the compiled .js results (would require compiling
        // the test files as well)?
        'unicorn/prefer-at': 'off',
        'import/no-extraneous-dependencies': [
          'error',
          { devDependencies: true, optionalDependencies: false, peerDependencies: false },
        ],
      },
    },
  ],

  rules: {
    curly: 'error', // Enforce braces on "if"/"for"/etc.
    // Avoid accidental use of "==" instead of "===".
    eqeqeq: 'error',
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
    // airbnb discourages "for..of", wtf? https://github.com/airbnb/javascript/issues/1271#issuecomment-548688952
    'no-restricted-syntax': 'off',
    'no-case-declarations': 'off',
    'no-prototype-builtins': 'off',
    'no-underscore-dangle': 'off',
    'no-mixed-operators': 'off',
    'func-names': 'off',
    'max-classes-per-file': 'off',
    'operator-assignment': ['error', 'never'],

    // For overloading (and typescript throws when dupe members anyway)
    'no-dupe-class-members': 'off',

    // Causes issues with enums
    'no-shadow': 'off',
    'prefer-destructuring': 'off', // Intentionally disabled trash.

    'import/extensions': 'off',
    'import/prefer-default-export': 'off',

    '@typescript-eslint/no-namespace': 'error',
    // TODO: '@typescript-eslint/no-floating-promises': 'error', // Promises must catch errors or be awaited.
    // TODO? '@typescript-eslint/no-unsafe-assignment': 'error',
    // TODO? '@typescript-eslint/no-unsafe-return': 'error',
    // TODO? '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // Rules from https://github.com/sindresorhus/eslint-plugin-unicorn
    // TODO: 'unicorn/no-useless-promise-resolve-reject': 'error',
    // TODO: 'unicorn/prefer-event-target': 'error',
    // TODO: 'unicorn/prefer-string-slice': 'error',
    // TODO? 'unicorn/custom-error-definition': 'error',
    // TODO? 'unicorn/prefer-json-parse-buffer': 'error',
    // TODO? ESM modules https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-module.md
    // 'unicorn/prefer-module': 'error',
    // 'unicorn/no-null': 'error',
    'unicorn/no-abusive-eslint-disable': 'error',
    'unicorn/prefer-at': 'error',
    'unicorn/prefer-negative-index': 'error',
    'unicorn/prefer-regexp-test': 'error',
    'unicorn/prefer-ternary': 'error',
    'unicorn/no-unnecessary-polyfills': 'error',
    'unicorn/no-useless-spread': 'error',
    'unicorn/prefer-array-some': 'error',
    'unicorn/prefer-blob-reading-methods': 'error',
    'unicorn/prefer-code-point': 'error',
    'unicorn/prefer-date-now': 'error',
    'unicorn/prefer-dom-node-text-content': 'error',
    'unicorn/prefer-includes': 'error',
    'unicorn/prefer-keyboard-event-key': 'error',
    'unicorn/prefer-modern-dom-apis': 'error',
    'unicorn/prefer-modern-math-apis': 'error',
    'unicorn/prefer-native-coercion-functions': 'error',
    'unicorn/prefer-node-protocol': 'error',
    'unicorn/prefer-object-from-entries': 'error',
    'unicorn/prefer-reflect-apply': 'error',
    'unicorn/prefer-string-trim-start-end': 'error',
    'unicorn/prefer-type-error': 'error',
  },

  settings: {
    'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts'] } },
  },
};
