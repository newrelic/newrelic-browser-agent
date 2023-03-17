module.exports = {
  ignorePatterns: [
    'dist/**/*',
    'build/**/*',
    'coverage/**/*',
    'tests/assets/frameworks/**/*',
    'tests/assets/js/internal/**/*',
    'tests/assets/js/vendor/**/*',
    'tests/assets/modular/js-errors/js/vendor/**/*',
    'tools/test-builds/**/*',

    // Remove the below ignores once lint errors are fixed
    'tools/scripts/publish-current.js',
    'tools/scripts/upload-to-s3.js'
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
  extends: ['standard'],
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
      files: ['src/common/constants/environment-variables.js'],
      globals: {
        process: true
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
    }
  ],
  rules: {
    'no-unused-vars': 'off',

    // Disable lint rules that need code changes to re-enabled
    camelcase: 'off',
    'no-var': 'off',
    'object-shorthand': 'off',
    'no-void': 'off',
    eqeqeq: 'off',
    'prefer-regex-literals': 'off',
    'new-cap': 'off',
    'no-new': 'off',
    'no-useless-return': 'off',
    'no-useless-constructor': 'off',
    'dot-notation': 'off',
    'spaced-comment': 'off',
    'no-unused-expressions': 'off',
    'import/first': 'off',
    'lines-between-class-members': 'off',
    'prefer-const': 'off',
    'no-use-before-define': 'off',
    'n/handle-callback-err': 'off',
    'valid-typeof': 'off',
    'no-unmodified-loop-condition': 'off',
    'n/no-deprecated-api': 'off',
    'no-undef': 'off',
    'no-control-regex': 'off',
    'no-prototype-builtins': 'off',
    'array-callback-return': 'off',
    'brace-style': 'off',
    'no-empty': 'off',
    'no-self-compare': 'off',
    'getter-return': 'off',
    'no-import-assign': 'off',
    'prefer-promise-reject-errors': 'off',
    'no-extend-native': 'off',
    'no-case-declarations': 'off',
    'no-eval': 'off',
    'no-mixed-operators': 'off',
    'no-tabs': 'off',
    'no-mixed-spaces-and-tabs': 'off',
    'no-return-assign': 'off',
    'no-unreachable-loop': 'off'
  }
}
