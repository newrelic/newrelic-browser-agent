beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const inpAttribution = {
  eventTarget: 'html',
  eventType: 'keydown',
  eventTime: 100,
  loadState: 'complete'
}
const getFreshINPImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onINP: jest.fn(cb => cb({ value: 8, attribution: inpAttribution, id: 'ruhroh' }))
  }))
  const { interactionToNextPaint } = await import('./interaction-to-next-paint')
  codeToRun(interactionToNextPaint)
}

describe('inp', () => {
  test('reports fcp from web-vitals', (done) => {
    getFreshINPImport(metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(8)
      expect(attrs).toEqual({ ...inpAttribution, metricId: 'ruhroh' })
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshINPImport(metric => {
      metric.subscribe(() => {
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
    let witness = 0
    getFreshINPImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(8)
        witness++
      })
      metric.subscribe(({ value }) => {
        expect(value).toEqual(8)
        witness++
        if (witness === 2) done()
      })
    })
  })

  test('reports more than once', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshINPImport(metric => {
      metric.subscribe(({ value }) => {
        triggered++
        expect(value).toEqual(8)
      })
      metric.update({ value: 8 })
      expect(triggered).toBeGreaterThanOrEqual(2)
      done()
    })
  })
})
