beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const getFreshLCPImport = async (codeToRun) => {
  const { largestContentfulPaint } = await import('./largest-contentful-paint')
  codeToRun(largestContentfulPaint)
}

describe('lcp', () => {
  test('reports lcp from web-vitals', (done) => {
    getFreshLCPImport(metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(1)
      expect(attrs).toMatchObject({
        size: expect.any(Number),
        eid: expect.any(String),
        elUrl: expect.any(String),
        elTag: expect.any(String)
      })
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshLCPImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('Does NOT report values if initiallyHidden', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: true,
      isBrowserScope: true
    }))

    getFreshLCPImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported')
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
    getFreshLCPImport(metric => {
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
      initiallyHidden: false,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshLCPImport(metric => metric.subscribe(({ value }) => {
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
