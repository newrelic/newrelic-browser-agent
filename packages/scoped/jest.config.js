module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    transform: {
      '^.+\\.(ts|tsx)?$': 'ts-jest',
      "^.+\\.(js|jsx)$": "babel-jest",
    },
    collectCoverage: true,
    // collectCoverageFrom: ["./dist/**"],
    // "coverageThreshold": {
    //   "global": {
    //     "lines": 90
    //   }
    // }
  };