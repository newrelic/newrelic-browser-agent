module.exports = {
  ignorePatterns: [
    "dist/**/*",
    "build/**/*",
    "coverage/**/*",
    "tests/**/*",
    "tools/**/*",
  ],
  env: {
    es2022: true,
  },
  globals: {
    WorkerNavigator: true,
    WorkerGlobalScope: true,
    NREUM: true,
    newrelic: true,
  },
  extends: ["eslint:recommended", "standard", "prettier"],
  overrides: [
    {
      files: ["src/**/*.js"],
      excludedFiles: "*.test.js",
      env: {
        browser: true,
      },
      parserOptions: {
        sourceType: "module",
      },
    },
    {
      files: ["src/common/constants/environment-variables.js"],
      globals: {
        process: true,
      },
    },
    {
      files: ["src/**/*.test.js"],
      env: {
        browser: true,
        node: true,
        jest: true,
      },
      parserOptions: {
        sourceType: "module",
      },
    },
    {
      files: [
        "webpack.*.js",
        "babel.*.js",
        "babel-env-vars.js",
        ".eslintrc.js",
        "jest.preset.js",
        "newrelic.js",
      ],
      env: {
        browser: true,
        node: true,
      },
    },
  ],
  rules: {
    "no-unused-vars": "off",

    // Disable lint rules that need code changes to re-enabled
    camelcase: "off",
    "no-var": "off",
    "object-shorthand": "off",
    "no-void": "off",
    eqeqeq: "off",
    "prefer-regex-literals": "off",
    "new-cap": "off",
    "no-new": "off",
    "no-useless-return": "off",
    "no-useless-constructor": "off",
    "dot-notation": "off",
    "spaced-comment": "off",
    "no-unused-expressions": "off",
    "import/first": "off",
    "lines-between-class-members": "off",
    "prefer-const": "off",
    "no-use-before-define": "off",
    "n/handle-callback-err": "off",
    "valid-typeof": "off",
    "no-unmodified-loop-condition": "off",
  },
};
