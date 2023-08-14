beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const getFreshFIDImport = async (codeToRun) => {
  const { firstInputDelay } = await import('./first-input-delay')
  codeToRun(firstInputDelay)
}

describe('fid', () => {
  test('reports fcp from web-vitals', (done) => {
    getFreshFIDImport(metric => metric.subscribe(({ current: value }) => {
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

    getFreshFIDImport(metric => {
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
      isBrowserScope: false
    }))

    getFreshFIDImport(metric => {
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
    getFreshFIDImport(metric => metric.subscribe(({ current: value }) => {
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
