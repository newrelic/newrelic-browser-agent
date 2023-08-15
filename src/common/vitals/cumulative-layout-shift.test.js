afterEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const getFreshCLSImport = async (codeToRun) => {
  const { cumulativeLayoutShift } = await import('./cumulative-layout-shift')
  codeToRun(cumulativeLayoutShift)
}

describe('cls', () => {
  test('reports cls', (done) => {
    getFreshCLSImport(metric => {
      metric.subscribe(({ current: value }) => {
        expect(value).toEqual(1)
        done()
      })
    })
  })
  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshCLSImport(metric => {
      metric.subscribe(({ current: value, attrs }) => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })
  test('multiple subs get same value', done => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let sub1, sub2
    getFreshCLSImport(metric => {
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
  test('reports only new values', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshCLSImport(metric => {
      metric.subscribe(({ current: value }) => {
        triggered++
        expect(value).toEqual(1)
        expect(triggered).toEqual(1)
        setTimeout(() => {
          expect(triggered).toEqual(1)
          done()
        }, 1000)
      })
    })
  })
})
