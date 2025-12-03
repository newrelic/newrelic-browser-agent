beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

let windowLoadCallback
let documentReadyCallback

const getFreshLoadTimeImport = async (codeToRun) => {
  jest.doMock('../../../../src/common/window/load', () => ({
    onWindowLoad: jest.fn(cb => { windowLoadCallback = cb }),
    onDocumentReady: jest.fn(cb => { documentReadyCallback = cb })
  }))
  const { loadTime } = await import('../../../../src/common/vitals/load-time')
  codeToRun(loadTime)
}

describe('load-time', () => {
  test('reports load time from navigation timing L2', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn(() => [{
            loadEventEnd: 1500
          }])
        }
      },
      supportsNavTimingL2: () => true
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1500)
        done()
      })
      windowLoadCallback()
    })
  })

  test('reports load time from performance.timing', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          timing: {
            loadEventEnd: 2000
          }
        }
      },
      originTime: 500,
      supportsNavTimingL2: () => false
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1500) // 2000 - 500
        done()
      })
      documentReadyCallback()
    })
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false,
      supportsNavTimingL2: () => true
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report if performance is not available', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {},
      supportsNavTimingL2: () => true
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      if (windowLoadCallback) windowLoadCallback()
      if (documentReadyCallback) documentReadyCallback()
      setTimeout(done, 1000)
    })
  })

  test('reports from whichever listener fires first - window load', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn(() => [{
            loadEventEnd: 1200
          }])
        }
      },
      supportsNavTimingL2: () => true
    }))

    let callCount = 0
    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        callCount++
        expect(value).toEqual(1200)
        expect(callCount).toEqual(1) // Should only be called once
      })
      windowLoadCallback() // Fire window load first
      documentReadyCallback() // Fire document ready second - should not trigger
      setTimeout(() => {
        expect(callCount).toEqual(1)
        done()
      }, 100)
    })
  })

  test('reports from whichever listener fires first - document ready', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          timing: {
            loadEventEnd: 3000
          }
        }
      },
      originTime: 1000,
      supportsNavTimingL2: () => false
    }))

    let callCount = 0
    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        callCount++
        expect(value).toEqual(2000)
        expect(callCount).toEqual(1) // Should only be called once
      })
      documentReadyCallback() // Fire document ready first
      windowLoadCallback() // Fire window load second - should not trigger
      setTimeout(() => {
        expect(callCount).toEqual(1)
        done()
      }, 100)
    })
  })

  test('multiple subs get same value', done => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn(() => [{
            loadEventEnd: 800
          }])
        }
      },
      supportsNavTimingL2: () => true
    }))

    let witness = 0
    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(800)
        witness++
      })
      metric.subscribe(({ value }) => {
        expect(value).toEqual(800)
        witness++
        if (witness === 2) done()
      })
      windowLoadCallback()
    })
  })

  test('reports only once', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn(() => [{
            loadEventEnd: 1000
          }])
        }
      },
      supportsNavTimingL2: () => true
    }))

    let triggered = 0
    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        triggered++
        expect(value).toEqual(1000)
        expect(triggered).toEqual(1)
      })
      windowLoadCallback()
      documentReadyCallback() // Should not trigger again
      windowLoadCallback() // Should not trigger again
      expect(triggered).toEqual(1)
      done()
    })
  })

  test('handles missing navigation entry gracefully', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn(() => []) // Empty array
        }
      },
      supportsNavTimingL2: () => true
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      windowLoadCallback()
      setTimeout(done, 1000)
    })
  })

  test('handles null navigation entry gracefully', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true,
      globalScope: {
        performance: {
          getEntriesByType: jest.fn(() => null)
        }
      },
      supportsNavTimingL2: () => true
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      windowLoadCallback()
      setTimeout(done, 1000)
    })
  })
})
