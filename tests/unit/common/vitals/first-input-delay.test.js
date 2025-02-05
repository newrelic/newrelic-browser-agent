beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const fidAttribution = {
  eventTarget: 'html>body',
  eventType: 'pointerdown',
  eventTime: 1,
  loadState: 'loading'
}
let triggeronFIDCallback
const getFreshFIDImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onFID: jest.fn(cb => { triggeronFIDCallback = cb; cb({ value: 100, attribution: fidAttribution }) })
  }))
  const { firstInputDelay } = await import('../../../../src/common/vitals/first-input-delay')
  codeToRun(firstInputDelay)
}

describe('fid', () => {
  test('reports fcp from web-vitals', (done) => {
    getFreshFIDImport(metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(1)
      expect(attrs.type).toEqual(fidAttribution.eventType)
      expect(attrs.fid).toEqual(100)
      expect(attrs.eventTarget).toEqual(fidAttribution.eventTarget)
      expect(attrs.loadState).toEqual(fidAttribution.loadState)
      done()
    }))
  })

  test('Does NOT report values if initiallyHidden', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: true,
      isBrowserScope: true
    }))

    getFreshFIDImport(metric => {
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

    getFreshFIDImport(metric => {
      metric.subscribe(({ value, attrs }) => {
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
    getFreshFIDImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1)
        witness++
      })
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1)
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
    getFreshFIDImport(metric => {
      metric.subscribe(({ value }) => {
        triggered++
        expect(value).toEqual(1)
        expect(triggered).toEqual(1)
      })
      triggeronFIDCallback({ value: 'notequal1' })
      expect(triggered).toEqual(1)
      done()
    })
  })
})
