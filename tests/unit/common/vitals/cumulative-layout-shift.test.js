afterEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const clsAttribution = {
  largestShiftTarget: 'element',
  largestShiftTime: 12345,
  largestShiftValue: 0.9712,
  loadState: 'dom-content-loaded'
}
let mockReturnVal = 0.123
const getFreshCLSImport = async (codeToRun, attribution = clsAttribution) => {
  jest.doMock('web-vitals/attribution', () => ({
    onCLS: jest.fn(cb => cb({ value: mockReturnVal, attribution, id: 'beepboop' }))
  }))
  const { cumulativeLayoutShift } = await import('../../../../src/common/vitals/cumulative-layout-shift')
  codeToRun(cumulativeLayoutShift)
}

describe('cls', () => {
  test('reports cls', (done) => {
    getFreshCLSImport(metric => {
      metric.subscribe(({ value, attrs }) => {
        expect(value).toEqual(0.123)
        expect(attrs).toEqual({ ...clsAttribution, metricId: 'beepboop' })
        done()
      })
    })
  })
  test('omits largestShiftTarget when undefined (web-vitals v6 when the shift target node was removed)', (done) => {
    mockReturnVal = 0.123
    getFreshCLSImport(metric => {
      metric.subscribe(({ value, attrs }) => {
        expect(value).toEqual(0.123)
        expect(attrs).toStrictEqual({
          metricId: 'beepboop',
          largestShiftTime: clsAttribution.largestShiftTime,
          largestShiftValue: clsAttribution.largestShiftValue,
          loadState: clsAttribution.loadState
        })
        done()
      })
    }, { ...clsAttribution, largestShiftTarget: undefined })
  })
  test('does NOT throw if web-vitals registration throws', async () => {
    jest.doMock('web-vitals/attribution', () => ({
      onCLS: jest.fn(() => { throw new TypeError('performance.getEntriesByType is not a function') })
    }))
    const { cumulativeLayoutShift } = await import('../../../../src/common/vitals/cumulative-layout-shift')
    expect(cumulativeLayoutShift.isValid).toEqual(false)
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
