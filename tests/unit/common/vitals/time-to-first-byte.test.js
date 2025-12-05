beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

let triggeronTTFBCallback
const getFreshTTFBImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onTTFB: jest.fn(cb => { triggeronTTFBCallback = cb; cb({ value: 1, attribution: {} }) })
  }))
  const { timeToFirstByte } = await import('../../../../src/common/vitals/time-to-first-byte')
  codeToRun(timeToFirstByte)
}

describe('ttfb', () => {
  test('reports ttfb from web-vitals', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      supportsNavTimingL2: () => true
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => metric.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false,
      supportsNavTimingL2: () => true
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report ttfb from web-vitals if no PNT', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      supportsNavTimingL2: jest.requireActual('../../../../src/common/constants/runtime').supportsNavTimingL2
    }))
    global.PerformanceNavigationTiming = undefined

    getFreshTTFBImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report ttfb from web-vitals if is iOS', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      isBrowserScope: true,
      supportsNavTimingL2: () => true
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('reports from performance.timing if cant use web-vitals', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      globalScope: {
        performance: {
          timing: {
            responseStart: 2
          }
        }
      },
      originTime: 1,
      isBrowserScope: true,
      supportsNavTimingL2: () => false
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1) // responseStart (2) - offset (1) === 1
        done()
      })
    })
  })

  test('multiple subs get same value', done => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      isiOS: false,
      supportsNavTimingL2: () => true
    }))
    global.PerformanceNavigationTiming = jest.fn()
    let witness = 0
    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1)
        witness++
      })
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1)
        witness++
        if (witness === 2) done()
      })
    })
  })

  test('reports only once', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      globalScope: {
        performance: {
          timing: {
            responseStart: 2
          }
        }
      },
      originTime: 1,
      isBrowserScope: true,
      supportsNavTimingL2: () => true
    }))
    let triggered = 0
    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        triggered++
        expect(value).toEqual(1)
        expect(triggered).toEqual(1)
      })
      triggeronTTFBCallback({ value: 'notequal1' })
      expect(triggered).toEqual(1)
      done()
    })
  })
})
