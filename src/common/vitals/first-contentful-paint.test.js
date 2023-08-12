let firstContentfulPaint
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
    getFreshFCPImport(firstContentfulPaint => firstContentfulPaint.subscribe(({ current: value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('reports fcp from paintEntries if ios<16', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      iOS_below16: true,
      initiallyHidden: false
    }))
    global.performance.getEntriesByType = jest.fn(() => [{ name: 'first-contentful-paint', startTime: 1 }])

    getFreshFCPImport(firstContentfulPaint => firstContentfulPaint.subscribe(({ current: value }) => {
      expect(value).toEqual(1)
      done()
    }))
  })

  test('Does NOT report values from paintEntries other than fcp', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      iOS_below16: true,
      initiallyHidden: false
    }))
    global.performance.getEntriesByType = jest.fn(() => [{ name: 'other-timing-name', startTime: 1 }])

    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(({ current: value }) => {
        console.log('should not have reported')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('Does NOT report fcp from paintEntries if ios<16 && initiallyHidden', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      iOS_below16: true,
      initiallyHidden: true
    }))
    global.performance.getEntriesByType = jest.fn(() => [{ name: 'first-contentful-paint', startTime: 1 }])

    getFreshFCPImport(firstContentfulPaint => {
      firstContentfulPaint.subscribe(({ current: value }) => {
        console.log('should not have reported....')
        expect(1).toEqual(2)
      })
      setTimeout(done, 2000)
    })
  })

  test('reports only once', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      iOS_below16: false,
      initiallyHidden: false
    }))
    let triggered = 0
    getFreshFCPImport(firstContentfulPaint => firstContentfulPaint.subscribe(({ current: value }) => {
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
