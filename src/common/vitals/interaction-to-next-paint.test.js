beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const getFreshINPImport = async (codeToRun) => {
  const { interactionToNextPaint } = await import('./interaction-to-next-paint')
  codeToRun(interactionToNextPaint)
}

describe('inp', () => {
  test('reports fcp from web-vitals', (done) => {
    getFreshINPImport(metric => metric.subscribe(({ current: value, attrs }) => {
      expect(value).toEqual(1)
      expect(attrs.metricId).toEqual('id')
      done()
    }))
  })

  test('reports more than once', (done) => {
    let triggered = 0
    getFreshINPImport(metric => {
      metric.subscribe(({ current: value }) => {
        triggered++
        expect(value).toEqual(1)
        expect(triggered).toEqual(1)
      })
      setTimeout(() => {
        // the metric emits every quarter second
        expect(triggered).toBeGreaterThanOrEqual(3)
        done()
      }, 1000)
    })
  })
})
