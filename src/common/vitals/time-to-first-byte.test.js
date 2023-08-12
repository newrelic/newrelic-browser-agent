beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const getFreshTTFBImport = async (codeToRun) => {
  const { timeToFirstByte } = await import('./time-to-first-byte')
  codeToRun(timeToFirstByte)
}

describe('lcp', () => {
  test('reports lcp from web-vitals', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: false
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => metric.subscribe(({ current: value, attrs }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('does NOT report lcp from web-vitals if no PNT', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: false
    }))
    global.PerformanceNavigationTiming = undefined

    getFreshTTFBImport(metric => {
      metric.subscribe(({ current: value, attrs }) => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report lcp from web-vitals if is iOS', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isiOS: true
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => {
      metric.subscribe(({ current: value, attrs }) => {
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
      offset: 1
    }))
    global.PerformanceNavigationTiming = undefined

    getFreshTTFBImport(metric => {
      metric.subscribe(({ current: value, attrs }) => {
        expect(value).toEqual(1) // responseStart (2) - offset (1) === 1
        done()
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
      offset: 1
    }))
    let triggered = 0
    getFreshTTFBImport(metric => metric.subscribe(({ current: value }) => {
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
