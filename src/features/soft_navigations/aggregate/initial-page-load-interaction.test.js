import { InitialPageLoadInteraction } from './initial-page-load-interaction'

jest.mock('../../../common/config/config', () => ({
  __esModule: true,
  getInfo: jest.fn().mockReturnValue({
    queueTime: 444,
    appTime: 888
  })
}))
jest.mock('../../../common/vitals/first-paint', () => ({
  __esModule: true,
  firstPaint: {
    current: { value: 111 }
  }
}))
jest.mock('../../../common/vitals/first-contentful-paint', () => ({
  __esModule: true,
  firstContentfulPaint: {
    current: { value: 222 }
  }
}))
jest.mock('../../../common/timing/nav-timing', () => ({
  __esModule: true,
  navTimingValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 333]
}))
jest.mock('../../../common/util/obfuscate', () => ({
  __esModule: true,
  Obfuscator: jest.fn(() => ({
    shouldObfuscate: jest.fn().mockReturnValue(false)
  }))
}))

test('InitialPageLoad serialized output is correct', () => {
  const ipl = new InitialPageLoadInteraction('abc')
  ipl.id = 'static-id'

  expect(ipl.navTiming).toBe('b,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1')
  expect(ipl.serialize()).toBe("1,,,,,,'initialPageLoad,'http://localhost/,1,1,,,cc,!!!'static-id,'1,33,66;b,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1")
})
