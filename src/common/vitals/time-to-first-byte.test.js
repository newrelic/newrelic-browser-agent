beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const getFreshTTFBImport = async (codeToRun) => {
  const { timeToFirstByte } = await import('./time-to-first-byte')
  codeToRun(timeToFirstByte)
}

describe('ttfb', () => {
  test('reports ttfb from web-vitals', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => metric.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
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
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true
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
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      isBrowserScope: true
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('reports from performance.timing if cant use web-vitals', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      globalScope: {
        performance: {
          timing: {
            responseStart: 2
          }
        }
      },
      offset: 1,
      isBrowserScope: true
    }))
    global.PerformanceNavigationTiming = undefined

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1) // responseStart (2) - offset (1) === 1
        done()
      })
    })
  })

  test('multiple subs get same value', done => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      isiOS: false
    }))
    global.PerformanceNavigationTiming = jest.fn()
    let sub1, sub2
    getFreshTTFBImport(metric => {
      const remove1 = metric.subscribe(({ entries }) => {
        sub1 ??= entries[0].id
        if (sub1 === sub2) { remove1(); remove2(); done() }
      })

      const remove2 = metric.subscribe(({ entries }) => {
        sub2 ??= entries[0].id
        if (sub1 === sub2) { remove1(); remove2(); done() }
      })
    })
  })

  test('reports only once', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      globalScope: {
        performance: {
          timing: {
            responseStart: 2
          }
        }
      },
      offset: 1,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshTTFBImport(metric => metric.subscribe(({ value }) => {
      triggered++
      expect(value).toEqual(1)
      expect(triggered).toEqual(1)
      setTimeout(() => {
        expect(triggered).toEqual(1)
        done()
      }, 1000)
    })
    )
  })
})
