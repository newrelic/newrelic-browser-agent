beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

let windowLoadCallback

const getFreshLoadTimeImport = async (codeToRun) => {
  jest.doMock('../../../../src/common/window/load', () => ({
    onWindowLoad: jest.fn((cb, useCapture) => { windowLoadCallback = cb })
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
      getNavigationEntry: () => ({ loadEventEnd: 1500 })
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
      getNavigationEntry: () => undefined
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1500) // 2000 - 500
        done()
      })
      windowLoadCallback()
    })
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false,
      getNavigationEntry: () => undefined
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
      getNavigationEntry: () => undefined
    }))

    getFreshLoadTimeImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      if (windowLoadCallback) windowLoadCallback()
      setTimeout(done, 1000)
    })
  })

  test('reports from window load listener', (done) => {
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
      getNavigationEntry: () => ({ loadEventEnd: 1200 })
    }))

    let callCount = 0
    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        callCount++
        expect(value).toEqual(1200)
        expect(callCount).toEqual(1) // Should only be called once
      })
      windowLoadCallback()
      setTimeout(() => {
        expect(callCount).toEqual(1)
        done()
      }, 100)
    })
  })

  test('reports only once even if callback fires multiple times', (done) => {
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
      getNavigationEntry: () => undefined
    }))

    let callCount = 0
    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        callCount++
        expect(value).toEqual(2000)
        expect(callCount).toEqual(1) // Should only be called once
      })
      windowLoadCallback() // Fire first time
      windowLoadCallback() // Fire second time - should not trigger due to isValid check
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
      getNavigationEntry: () => ({ loadEventEnd: 800 })
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
      getNavigationEntry: () => ({ loadEventEnd: 1000 })
    }))

    let triggered = 0
    getFreshLoadTimeImport(metric => {
      metric.subscribe(({ value }) => {
        triggered++
        expect(value).toEqual(1000)
        expect(triggered).toEqual(1)
      })
      windowLoadCallback()
      windowLoadCallback() // Should not trigger again due to isValid check
      // Defer assertions past the setTimeout(0) used to ensure loadEventEnd is valid
      setTimeout(() => {
        expect(triggered).toEqual(1)
        done()
      }, 100)
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
      getNavigationEntry: () => undefined
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
      getNavigationEntry: () => undefined
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
