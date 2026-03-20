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
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 100 }])
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      getNavigationEntry: () => mockPerformance?.getEntriesByType('navigation')?.[0],
      globalScope: {
        performance: mockPerformance
      }
    }))

    getFreshTTFBImport(metric => metric.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false,
      getNavigationEntry: () => undefined,
      globalScope: {}
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
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 100 }]),
      timing: {}
    }
    global.PerformanceNavigationTiming = undefined
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      getNavigationEntry: () => typeof PerformanceNavigationTiming !== 'undefined' ? mockPerformance?.getEntriesByType('navigation')?.[0] : undefined,
      globalScope: {
        performance: mockPerformance
      }
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report ttfb from web-vitals if is iOS', (done) => {
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 100 }]),
      timing: {}
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      isBrowserScope: true,
      getNavigationEntry: () => mockPerformance?.getEntriesByType('navigation')?.[0],
      globalScope: {
        performance: mockPerformance
      }
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
    const mockPerformance = {
      timing: {
        responseStart: 2
      }
    }
    global.PerformanceNavigationTiming = undefined
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      globalScope: {
        performance: mockPerformance
      },
      originTime: 1,
      isBrowserScope: true,
      getNavigationEntry: () => mockPerformance?.getEntriesByType?.('navigation')?.[0]
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1) // responseStart (2) - offset (1) === 1
        done()
      })
    })
  })

  test('multiple subs get same value', done => {
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 100 }])
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      isiOS: false,
      getNavigationEntry: () => mockPerformance?.getEntriesByType('navigation')?.[0],
      globalScope: {
        performance: mockPerformance
      }
    }))
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
    const mockPerformance = {
      timing: {
        responseStart: 2
      },
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 0 }]) // Invalid responseStart
    }
    global.PerformanceNavigationTiming = undefined
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: true,
      globalScope: {
        performance: mockPerformance
      },
      originTime: 1,
      isBrowserScope: true,
      getNavigationEntry: () => mockPerformance?.getEntriesByType('navigation')?.[0]
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
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: 0 }]),
      timing: {
        responseStart: 150
      }
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: mockPerformance
      },
      originTime: 100,
      getNavigationEntry: () => {
        const entry = mockPerformance?.getEntriesByType('navigation')?.[0]
        return (entry && entry.responseStart > 0) ? entry : undefined
      }
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (150) - originTime (100)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if responseStart is undefined', (done) => {
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: undefined }]),
      timing: {
        responseStart: 250
      }
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: mockPerformance
      },
      originTime: 200,
      getNavigationEntry: () => {
        const entry = mockPerformance?.getEntriesByType('navigation')?.[0]
        return (entry && entry.responseStart > 0) ? entry : undefined
      }
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (250) - originTime (200)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if responseStart is null', (done) => {
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([{ responseStart: null }]),
      timing: {
        responseStart: 350
      }
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: mockPerformance
      },
      originTime: 300,
      getNavigationEntry: () => {
        const entry = mockPerformance?.getEntriesByType('navigation')?.[0]
        return (entry && entry.responseStart > 0) ? entry : undefined
      }
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (350) - originTime (300)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if navigation entry array is empty', (done) => {
    const mockPerformance = {
      getEntriesByType: jest.fn().mockReturnValue([]), // Empty array
      timing: {
        responseStart: 450
      }
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: mockPerformance
      },
      originTime: 400,
      getNavigationEntry: () => mockPerformance?.getEntriesByType('navigation')?.[0]
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped
        expect(value).toEqual(50) // timing.responseStart (450) - originTime (400)
        done()
      })
    })
  })

  test('does NOT report ttfb from web-vitals if getEntriesByType throws error', (done) => {
    const mockPerformance = {
      getEntriesByType: jest.fn().mockImplementation(() => {
        throw new Error('Navigation timing access error')
      }),
      timing: {
        responseStart: 550
      }
    }
    global.PerformanceNavigationTiming = jest.fn()
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isiOS: false,
      isBrowserScope: true,
      globalScope: {
        performance: mockPerformance
      },
      originTime: 500,
      getNavigationEntry: () => {
        try {
          return mockPerformance?.getEntriesByType('navigation')?.[0]
        } catch (e) {
          return undefined
        }
      }
    }))

    getFreshTTFBImport(metric => {
      metric.subscribe(({ value }) => {
        // Should fall back to performance.timing since web-vitals onTTFB is skipped due to error
        expect(value).toEqual(50) // timing.responseStart (550) - originTime (500)
        done()
      })
    })
  })
})
