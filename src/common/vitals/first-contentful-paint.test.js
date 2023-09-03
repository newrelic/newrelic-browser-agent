beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const getFreshFCPImport = async (codeToRun) => {
  const { firstContentfulPaint } = await import('./first-contentful-paint')
  codeToRun(firstContentfulPaint)
}

describe('fcp', () => {
  test('reports fcp from web-vitals', (done) => {
    getFreshFCPImport(firstContentfulPaint => firstContentfulPaint.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('reports fcp from paintEntries if ios<16', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      iOSBelow16: true,
      initiallyHidden: false,
      isBrowserScope: true
    }))
    global.performance.getEntriesByType = jest.fn(() => [{ name: 'first-contentful-paint', startTime: 1 }])

    getFreshFCPImport(firstContentfulPaint => firstContentfulPaint.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
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
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      iOSBelow16: true,
      initiallyHidden: false,
      isBrowserScope: true
    }))
    global.performance.getEntriesByType = jest.fn(() => [{ name: 'other-timing-name', startTime: 1 }])

    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(() => {
        console.log('should not have reported')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('Does NOT report fcp from paintEntries if ios<16 && initiallyHidden', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      iOSBelow16: true,
      initiallyHidden: true,
      isBrowserScope: true
    }))
    global.performance.getEntriesByType = jest.fn(() => [{ name: 'first-contentful-paint', startTime: 1 }])

    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(() => {
        console.log('should not have reported....')
        expect(1).toEqual(2)
      })
      setTimeout(done, 2000)
    })
  })

  test('multiple subs get same value', done => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let sub1, sub2
    getFreshFCPImport(metric => {
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
      iOSBelow16: false,
      initiallyHidden: false,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshFCPImport(firstContentfulPaint => firstContentfulPaint.subscribe(({ value }) => {
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
