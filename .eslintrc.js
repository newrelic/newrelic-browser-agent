module.exports = {
  ignorePatterns: [
    'dist/**/*',
    'temp/**/*',
    'build/**/*',
    'coverage/**/*',
    'node_modules/**/*',
    'tests/assets/frameworks/**/*',
    'tests/assets/js/internal/**/*',
    'tests/assets/js/vendor/**/*',
    'tests/assets/test-builds/**/*',
    'tests/assets/modular/js-errors/js/vendor/**/*',

    // Remove the below ignores once lint errors are fixed
    'tools/scripts/publish-current.js',
    'tools/scripts/upload-to-s3.js',

    // Ignore JIL code since it is being replaced with WDIO
    'tools/jil/**/*',
    'tests/browser/**/*',
    'tests/functional/**/*'
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      plugins: [
        '@babel/plugin-syntax-import-assertions'
      ]
    }
  },
  env: {
    es2022: true
  },
  globals: {
    WorkerNavigator: true,
    WorkerGlobalScope: true,
    NREUM: true,
    newrelic: true
  },
  plugins: ['sonarjs'],
  extends: ['standard', 'plugin:sonarjs/recommended'],
  overrides: [
    {
      files: ['**/*.mjs'],
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      files: ['src/**/*.js'],
      excludedFiles: '*.test.js',
      env: {
        browser: true
      },
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      files: ['src/**/*.test.js', 'tests/specs/**/*.e2e.js'],
      env: {
        browser: true,
        node: true,
        jest: true
      },
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      files: ['webpack.*.js', 'babel.*.js', 'babel-env-vars.js', '.eslintrc.js', 'jest.preset.js', 'newrelic.js'],
      env: {
        browser: true,
        node: true
      }
    },
    {
      files: ['tests/functional/**/*.test.js'],
      env: {
        browser: true,
        node: true
      },
      rules: {
        'no-throw-literal': 'off'
      }
    }
  ],
  rules: {
    // Disable lint rules that need code changes to re-enabled
    'no-unused-vars': 'off',
    camelcase: 'off',
    'no-var': 'off',
    'object-shorthand': 'off',
    'no-void': 'off',
    eqeqeq: 'off',
    'prefer-regex-literals': 'off',
    'new-cap': 'off',
    'no-new': 'off',
    'no-useless-return': 'off',
    'dot-notation': 'off',
    'spaced-comment': 'off',
    'no-unused-expressions': 'off',
    'prefer-const': 'off',
    'no-use-before-define': 'off',
    'valid-typeof': 'off',
    'no-undef': 'off',
    'no-return-assign': 'off',

    'n/handle-callback-err': 'off',
    'n/no-deprecated-api': 'off',

    'sonarjs/cognitive-complexity': 'off',
    'sonarjs/no-duplicate-string': 'off',
    'sonarjs/no-collapsible-if': 'off',
    'sonarjs/no-nested-template-literals': 'off',
    'sonarjs/no-extra-arguments': 'off',
    'sonarjs/no-small-switch': 'off',
    'sonarjs/no-redundant-jump': 'off',
    'sonarjs/no-identical-expressions': 'off',
    'sonarjs/no-identical-functions': 'off',
    'sonarjs/prefer-object-literal': 'off',
    'sonarjs/prefer-single-boolean-return': 'off',
    'sonarjs/no-redundant-boolean': 'off',
    'sonarjs/no-duplicated-branches': 'off'
  }
}
