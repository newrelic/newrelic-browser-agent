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
    getFreshLCPImport(metric => metric.subscribe(({ current: value, attrs }) => {
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

  test('Does NOT report values if initiallyHidden', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: true
    }))

    getFreshLCPImport(metric => {
      metric.subscribe(({ current: value }) => {
        console.log('should not have reported')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('reports only once', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: false
    }))
    let triggered = 0
    getFreshLCPImport(metric => metric.subscribe(({ current: value }) => {
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
