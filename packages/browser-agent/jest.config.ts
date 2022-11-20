/* eslint-disable */
export default {
  displayName: 'browser-agent',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/browser-agent',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!*.d.ts',
    '!*.interface[s]?.ts',
  ],
};
