beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const inpAttribution = {
  interactionType: 'keyboard',
  interactionTarget: 'html',
  interactionTime: 100,
  inputDelay: 0,
  nextPaintTime: 200,
  processingDuration: 0,
  presentationDelay: 0,
  loadState: 'complete'
}
const getFreshINPImport = async (codeToRun, attribution = inpAttribution, entries = [{}]) => {
  jest.doMock('web-vitals/attribution', () => ({
    onINP: jest.fn(cb => cb({ value: 8, attribution, id: 'ruhroh', entries }))
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

  test('omits interactionTarget when web-vitals could not resolve the target (undefined as of v6)', (done) => {
    getFreshINPImport(metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(8)
      expect(attrs).toStrictEqual({
        interactionTime: inpAttribution.interactionTime,
        eventTime: inpAttribution.interactionTime,
        interactionType: inpAttribution.interactionType,
        inputDelay: inpAttribution.inputDelay,
        nextPaintTime: inpAttribution.nextPaintTime,
        processingDuration: inpAttribution.processingDuration,
        presentationDelay: inpAttribution.presentationDelay,
        loadState: inpAttribution.loadState,
        metricId: 'ruhroh'
      })
      done()
    }), { ...inpAttribution, interactionTarget: undefined })
  })

  test('does NOT report the synthetic no-entries INP web-vitals v6 emits after a bfcache restore', (done) => {
    const dummyAttribution = {
      // Mimic web-vitals v6 dummy INP attribution, reported when the interaction count went up with no event entry (bfcache restore / soft nav)
      processedEventEntries: [],
      longAnimationFrameEntries: [],
      inputDelay: 0,
      processingDuration: 0,
      presentationDelay: 8,
      loadState: 'complete'
    }

    getFreshINPImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    }, dummyAttribution, [])
  })

  test('does NOT throw if web-vitals registration throws', async () => {
    jest.doMock('web-vitals/attribution', () => ({
      onINP: jest.fn(() => { throw new TypeError('performance.getEntriesByType is not a function') })
    }))
    const { interactionToNextPaint } = await import('../../../../src/common/vitals/interaction-to-next-paint')
    expect(interactionToNextPaint.isValid).toEqual(false)
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
