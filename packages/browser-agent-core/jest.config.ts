/* eslint-disable */
export default {
  displayName: "browser-agent-core",
  preset: "../../jest.preset.js",
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.spec.json",
    },
  },
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/packages/browser-agent-core",
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!*.d.ts',
    '!*.interface[s]?.ts',
  ],
};
