beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const fcpAttribution = {
  timeToFirstByte: 12,
  firstByteToFCP: 23,
  loadState: 'dom-interactive'
}
let triggeronFCPCallback
const getFreshFCPImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onFCP: jest.fn(cb => { triggeronFCPCallback = cb; cb({ value: 1, attribution: fcpAttribution }) })
  }))
  const { firstContentfulPaint } = await import('../../../../src/common/vitals/first-contentful-paint')
  codeToRun(firstContentfulPaint)
}

describe('fcp', () => {
  test('reports fcp from web-vitals', (done) => {
    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(({ value, attrs }) => {
        expect(value).toEqual(1)
        expect(attrs).toStrictEqual(fcpAttribution)
        done()
      })
    })
  })

  test('reports fcp from paintEntries if ios<16', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      iOSBelow16: true,
      initiallyHidden: false,
      isBrowserScope: true
    }))

    Object.defineProperty(performance, 'getEntriesByType', {
      value: jest.fn().mockImplementation(entryType => {
        return [
          {
            name: 'first-contentful-paint',
            startTime: 1
          }
        ]
      }),
      configurable: true,
      writable: true
    })

    getFreshFCPImport(firstContentfulPaint => firstContentfulPaint.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshFCPImport(metric => {
      metric.subscribe(({ value, attrs }) => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('Does NOT report values from paintEntries other than fcp', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      iOSBelow16: true,
      initiallyHidden: false,
      isBrowserScope: true
    }))

    Object.defineProperty(performance, 'getEntriesByType', {
      value: jest.fn().mockImplementation(entryType => {
        return [
          {
            name: 'other-timing-name',
            startTime: 1
          }
        ]
      }),
      configurable: true,
      writable: true
    })

    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(() => {
        console.log('should not have reported')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('Does NOT report fcp from paintEntries if ios<16 && initiallyHidden', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      iOSBelow16: true,
      initiallyHidden: true,
      isBrowserScope: true
    }))
    Object.defineProperty(performance, 'getEntriesByType', {
      value: jest.fn().mockImplementation(entryType => {
        return [
          {
            name: 'first-contentful-paint',
            startTime: 1
          }
        ]
      }),
      configurable: true,
      writable: true
    })

    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(() => {
        console.log('should not have reported....')
        expect(1).toEqual(2)
      })
      setTimeout(done, 2000)
    })
  })

  test('multiple subs get same value', done => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let witness = 0
    getFreshFCPImport(metric => {
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
      iOSBelow16: false,
      initiallyHidden: false,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(({ value }) => {
        triggered++
        expect(value).toEqual(1)
        expect(triggered).toEqual(1)
      })
      triggeronFCPCallback({ value: 'notequal1' })
      expect(triggered).toEqual(1)
      done()
    })
  })

  test('FAILING: should include pageUrl from navigationEntry to prevent soft-nav misattribution', async (done) => {
    const fcpAttributionWithNavEntry = {
      timeToFirstByte: 12,
      firstByteToFCP: 23,
      loadState: 'dom-interactive',
      navigationEntry: {
        name: 'https://example.com/original-page?query=param#hash'
      }
    }

    jest.doMock('web-vitals/attribution', () => ({
      onFCP: jest.fn(cb => { cb({ value: 1, attribution: fcpAttributionWithNavEntry }) })
    }))
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      iOSBelow16: false,
      initiallyHidden: false,
      isBrowserScope: true
    }))

    const { firstContentfulPaint } = await import('../../../../src/common/vitals/first-contentful-paint')
    firstContentfulPaint.subscribe(({ value, attrs }) => {
      expect(value).toEqual(1)
      expect(attrs.timeToFirstByte).toEqual(12)
      expect(attrs.firstByteToFCP).toEqual(23)
      expect(attrs.loadState).toEqual('dom-interactive')
      // This assertion will FAIL because FCP doesn't currently include pageUrl like LCP does
      expect(attrs.pageUrl).toEqual('https://example.com/original-page')
      done()
    })
  })
})
