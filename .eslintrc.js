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
  extends: ["eslint:recommended", "prettier"],
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
  },
};
