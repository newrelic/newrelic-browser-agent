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
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1)
        done()
      })
      metric.update({ value: 1 })
    })
  })
  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshCLSImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      metric.update({ value: 1 })
      setTimeout(done, 1000)
    })
  })
  test('multiple subs get same value', done => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let witness = 0
    getFreshCLSImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(5)
        witness++
      })
      metric.subscribe(({ value }) => {
        expect(value).toEqual(5)
        witness++
        if (witness === 2) done()
      })
      metric.update({ value: 5 })
    })
  })
})
