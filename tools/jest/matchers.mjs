// Jest-Extended Matchers: https://jest-extended.jestcommunity.dev/docs/matchers
import * as matchers from 'jest-extended'

// Treat imports differently based on if this file
// is being imported into WDIO or Jest
expect.extend(
  matchers.default ? matchers.default : matchers
)
