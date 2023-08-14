beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()

  const mockPerformanceObserver = jest.fn(cb => ({
    // eslint-disable-next-line
    observe: () => cb({getEntries: () => [{ name: 'first-paint', startTime: 1 }] }),
    disconnect: jest.fn()
  }))
  global.PerformanceObserver = mockPerformanceObserver
  global.PerformanceObserver.supportedEntryTypes = ['paint']
})

const getFreshFPImport = async (codeToRun) => {
  const { firstPaint } = await import('./first-paint')
  codeToRun(firstPaint)
}

describe('fp', () => {
  test('reports fp', (done) => {
    getFreshFPImport(metric => metric.subscribe(({ current: value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('Does NOT report values if initiallyHidden', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: true,
      isBrowserScope: true
    }))

    getFreshFPImport(metric => {
      metric.subscribe(({ current: value }) => {
        console.log('should not have reported')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: false,
      isBrowserScope: false
    }))

    getFreshFPImport(metric => {
      metric.subscribe(({ current: value, attrs }) => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report other metrics', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: false,
      isBrowserScope: true
    }))

    const mockPerformanceObserver = jest.fn(cb => ({
      // eslint-disable-next-line
      observe: () => cb({getEntries: () => [{ name: 'other-metric', startTime: 1 }] }),
      disconnect: jest.fn()
    }))
    global.PerformanceObserver = mockPerformanceObserver
    global.PerformanceObserver.supportedEntryTypes = ['paint']

    getFreshFPImport(metric => {
      metric.subscribe(({ current: value, attrs }) => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('reports only once', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: false,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshFPImport(metric => metric.subscribe(({ current: value }) => {
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
