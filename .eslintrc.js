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
    'tests/assets/scripts/**/*',
    'tests/assets/test-builds/**/*',
    'tests/assets/modular/js-errors/js/vendor/**/*',
    'tests/dts/**/*',

    // Ignore old JIL test code since they are being migrated to WDIO
    'tests/browser/**/*',
    'tests/functional/**/*'
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false
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
      excludedFiles: ['__mocks__/**/*'],
      env: {
        browser: true
      },
      parserOptions: {
        sourceType: 'module'
      },
      rules: {
        'no-console': ['error'],
        'n/no-callback-literal': 'off' // This is not NodeJS code and should not be forced to adhere to NodeJS callback parameter pattern
      }
    },
    {
      files: ['src/**/__mocks__/**/*', 'tests/unit/**/*', 'tests/components/**/*'],
      env: {
        browser: true,
        node: true,
        jest: true
      },
      parserOptions: {
        sourceType: 'module'
      },
      rules: {
        'sonarjs/no-duplicate-string': 'off', // It is not worth deduplicating strings in test code
        'sonarjs/no-identical-functions': 'off',
        'n/no-callback-literal': 'off' // This is not NodeJS code and should not be forced to adhere to NodeJS callback parameter pattern
      }
    },
    {
      files: ['tests/specs/**/*', 'tests/webview-specs/**/*'],
      globals: {
        browser: true,
        driver: true,
        expect: true,
        $: true,
        browserMatch: true
      },
      env: {
        browser: true,
        node: true,
        mocha: true
      },
      parserOptions: {
        sourceType: 'module'
      },
      rules: {
        'sonarjs/no-duplicate-string': 'off' // It is not worth deduplicating strings in test code
      }
    },
    {
      files: ['tools/**/*'],
      globals: {
        browser: true
      },
      env: {
        browser: true,
        node: true,
        jest: true
      },
      rules: {
        'sonarjs/no-duplicate-string': 'off' // It is not worth deduplicating strings in tooling code
      }
    },
    {
      files: ['webpack.*.js', 'babel.config.js', 'babel-env-vars.js', '.eslintrc.js', 'jest.preset.js', 'newrelic.js'],
      env: {
        browser: true,
        node: true
      },
      rules: {
        'sonarjs/no-duplicate-string': 'off' // It is not worth deduplicating strings in tooling code
      }
    },
    {
      files: ['tests/functional/**/*.test.js', 'tests/assets/**/*.js'],
      env: {
        browser: true,
        node: true
      },
      rules: {
        'no-throw-literal': 'off' // We need to be able to test throwing literals
      }
    }
  ],
  rules: {
    // Disable lint rules that need code changes to re-enabled
    'no-var': 'off',
    'no-new': 'off',
    'prefer-const': 'off',

    'sonarjs/cognitive-complexity': 'off',
    camelcase: 'off'
  }
}
