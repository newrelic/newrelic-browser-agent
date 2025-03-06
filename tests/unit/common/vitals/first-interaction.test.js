beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const inpAttribution = {
  interactionType: 'pointer',
  interactionTarget: 'button',
  interactionTime: 8853.8,
  inputDelay: 0,
  nextPaintTime: 200,
  processingDuration: 0,
  presentationDelay: 0,
  loadState: 'complete'
}
const getFreshImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onINP: jest.fn(cb => cb({ value: 8, attribution: inpAttribution, id: 'ruhroh' }))
  }))
  const { firstInteraction } = await import('../../../../src/common/vitals/interaction-to-next-paint')
  codeToRun(firstInteraction)
}

describe('fi (first interaction)', () => {
  test('reports fi', (done) => {
    getFreshImport((metric) => {
      metric.subscribe(({ value, attrs }) => {
        expect(value).toEqual(8853)
        expect(attrs.type).toEqual('pointer')
        expect(attrs.eventTarget).toEqual('button')
        expect(attrs.loadState).toEqual('complete')
        done()
      })
    })
  })

  test('Does NOT report values if initiallyHidden', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: true,
      isBrowserScope: true
    }))

    getFreshImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: false,
      isBrowserScope: false
    }))

    getFreshImport(metric => {
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
      initiallyHidden: false,
      isBrowserScope: true
    }))
    let witness = 0
    getFreshImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(8853)
        witness++
      })
      metric.subscribe(({ value }) => {
        expect(value).toEqual(8853)
        witness++
        if (witness === 2) done()
      })
    })
  })

  test('reports only once', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: false,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshImport(metric => metric.subscribe(({ value }) => {
      triggered++
      expect(value).toEqual(8853)
      expect(triggered).toEqual(1)
      setTimeout(() => {
        expect(triggered).toEqual(1)
        done()
      }, 1000)
    }))
  })
})
