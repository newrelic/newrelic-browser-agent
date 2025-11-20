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
      globalScope: {
        performance: {
          getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 100 }])
        }
      }
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
    jest.doMock('../../../../src/common/constants/runtime', () => ({
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
    jest.doMock('../../../../src/common/constants/runtime', () => ({
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
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      isiOS: false,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 100 }])
        }
      }
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
          },
          getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 0 }]) // Invalid responseStart
        }
      },
      originTime: 1,
      isBrowserScope: true
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

  test('does NOT report ttfb from web-vitals if responseStart is falsy (0)', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 0 }]),
          timing: {
            responseStart: 150
          }
        }
      },
      originTime: 100
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (150) - originTime (100)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if responseStart is undefined', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn().mockReturnValue([{ responseStart: undefined }]),
          timing: {
            responseStart: 250
          }
        }
      },
      originTime: 200
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (250) - originTime (200)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if responseStart is null', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn().mockReturnValue([{ responseStart: null }]),
          timing: {
            responseStart: 350
          }
        }
      },
      originTime: 300
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (350) - originTime (300)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if navigation entry array is empty', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn().mockReturnValue([]), // Empty array
          timing: {
            responseStart: 450
          }
        }
      },
      originTime: 400
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (450) - originTime (400)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if getEntriesByType throws error', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn().mockImplementation(() => {
            throw new Error('Navigation timing access error')
          }),
          timing: {
            responseStart: 550
          }
        }
      },
      originTime: 500
    }))
    global.PerformanceNavigationTiming = jest.fn()

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped due to error
        expect(value).toEqual(50) // timing.responseStart (550) - originTime (500)
        done()
      })
    })
  })
})
