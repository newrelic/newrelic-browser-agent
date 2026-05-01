afterEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
  mockReturnVal = 0.123 // Reset to default value
})

const clsAttribution = {
  largestShiftTarget: 'element',
  largestShiftTime: 12345,
  largestShiftValue: 0.9712,
  loadState: 'dom-content-loaded',
  largestShiftSource: {
    node: document.createElement('div')
  }
}
let mockReturnVal = 0.123
const getFreshCLSImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onCLS: jest.fn(cb => cb({ value: mockReturnVal, attribution: clsAttribution, id: 'beepboop' }))
  }))
  const { cumulativeLayoutShift } = await import('../../../../src/common/vitals/cumulative-layout-shift')
  codeToRun(cumulativeLayoutShift)
}

describe('cls', () => {
  test('reports cls', (done) => {
    getFreshCLSImport(metric => {
      metric.subscribe(({ value, element, attrs }) => {
        expect(value).toEqual(0.123)
        const { largestShiftSource, ...expectedAttrs } = clsAttribution
        expect(element).toEqual(largestShiftSource.node)
        expect(element instanceof HTMLElement).toBe(true)
        expect(attrs).toEqual({ ...expectedAttrs, metricId: 'beepboop' })
        done()
      })
    })
  })
  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshCLSImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })
  test('multiple subs get same value', done => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let witness = 0
    getFreshCLSImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(0.123)
        witness++
      })
      metric.subscribe(({ value }) => {
        expect(value).toEqual(0.123)
        witness++
        if (witness === 2) done()
      })
    })
  })
  test('null value is not reported', done => {
    mockReturnVal = null
    getFreshCLSImport(metric => {
      metric.subscribe(({ value, attrs }) => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
    })
    setTimeout(done, 1000) // should not get subscribe invokation
  })
  test('undefined value is not reported', done => {
    mockReturnVal = undefined
    getFreshCLSImport(metric => {
      metric.subscribe(({ value, attrs }) => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
    })
    setTimeout(done, 1000) // should not get subscribe invokation
  })
  test('zero value IS reported', done => {
    mockReturnVal = 0
    getFreshCLSImport(metric => {
      metric.subscribe(({ value, attrs }) => {
        expect(value).toEqual(0)
        done()
      })
    })
  })
})
