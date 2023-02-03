module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/?(*.)+(spec|test).[tj]s?(x)"],
  transform: {
    "\\.[jt]sx?$": "babel-jest",
  },
};
