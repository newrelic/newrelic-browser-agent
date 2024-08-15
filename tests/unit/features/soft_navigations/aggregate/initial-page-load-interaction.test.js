import { InitialPageLoadInteraction } from '../../../../../src/features/soft_navigations/aggregate/initial-page-load-interaction'
import * as configModule from '../../../../../src/common/config/config'
import { Obfuscator } from '../../../../../src/common/util/obfuscate'

jest.mock('../../../../../src/common/config/config', () => ({
  __esModule: true,
  getInfo: jest.fn().mockReturnValue({
    queueTime: 444,
    appTime: 888
  }),
  getConfigurationValue: jest.fn(),
  getRuntime: jest.fn()
}))
jest.mock('../../../../../src/common/vitals/first-paint', () => ({
  __esModule: true,
  firstPaint: {
    current: { value: 111 }
  }
}))
jest.mock('../../../../../src/common/vitals/first-contentful-paint', () => ({
  __esModule: true,
  firstContentfulPaint: {
    current: { value: 222 }
  }
}))
jest.mock('../../../../../src/common/timing/nav-timing', () => ({
  __esModule: true,
  navTimingValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 333]
}))

beforeEach(() => {
  jest.mocked(configModule.getRuntime).mockReturnValue({
    obfuscator: new Obfuscator('abcd')
  })
})

test('InitialPageLoad serialized output is correct', () => {
  const ipl = new InitialPageLoadInteraction('abc')
  ipl.id = 'static-id'
  ipl.end = 123.45

  expect(ipl.navTiming).toBe('b,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1')
  expect(ipl.serialize(0)).toBe("1,,,3f,,,'initialPageLoad,'http://localhost/,1,1,,,cc,!!!'static-id,'1,33,66;b,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1")
})
