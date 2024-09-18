beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const inpAttribution = {
  interactionType: 'keydown',
  interactionTarget: 'html',
  interactionTime: 100,
  inputDelay: 0,
  nextPaintTime: 200,
  processingDuration: 0,
  presentationDelay: 0,
  loadState: 'complete'
}
const getFreshINPImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onINP: jest.fn(cb => cb({ value: 8, attribution: inpAttribution, id: 'ruhroh' }))
  }))
  const { interactionToNextPaint } = await import('../../../../src/common/vitals/interaction-to-next-paint')
  codeToRun(interactionToNextPaint)
}

describe('inp', () => {
  test('reports inp from web-vitals', (done) => {
    getFreshINPImport(metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(8)
      expect(attrs).toStrictEqual({
        eventTarget: inpAttribution.interactionTarget,
        eventTime: inpAttribution.interactionTime,
        interactionTarget: inpAttribution.interactionTarget,
        interactionTime: inpAttribution.interactionTime,
        interactionType: inpAttribution.interactionType,
        inputDelay: inpAttribution.inputDelay,
        nextPaintTime: inpAttribution.nextPaintTime,
        processingDuration: inpAttribution.processingDuration,
        presentationDelay: inpAttribution.presentationDelay,
        loadState: inpAttribution.loadState,
        metricId: 'ruhroh'
      })
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
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
    jest.doMock('../../../../src/common/constants/runtime', () => ({
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
    jest.doMock('../../../../src/common/constants/runtime', () => ({
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
