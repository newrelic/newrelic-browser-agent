import { PERFORMANCE_ENTRY_TYPE } from '../../../../src/common/vitals/constants'

beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()

  const mockPerformanceObserver = jest.fn(cb => ({
    // Note: this is an imperfect mock, as observer.disconnect() is not functional
    observe: () => {
      const callCb = () => {
        cb({
          getEntries: () => [{
            name: PERFORMANCE_ENTRY_TYPE.FIRST_INPUT,
            startTime: 1
          }]
        })
        setTimeout(callCb, 250)
      }
      setTimeout(callCb, 250)
      // }
    },
    disconnect: jest.fn()
  }))
  global.PerformanceObserver = mockPerformanceObserver
  global.PerformanceObserver.supportedEntryTypes = [PERFORMANCE_ENTRY_TYPE.FIRST_INPUT]
})

const getFreshImport = async (codeToRun) => {
  const { firstInteraction } = await import('../../../../src/common/vitals/first-interaction')
  codeToRun(firstInteraction)
}

describe('fi (first interaction)', () => {
  test('reports fi', (done) => {
    getFreshImport(metric => {
      metric.subscribe(({ value }) => {
        expect(value).toEqual(1)
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
    getFreshImport(metric => {
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
    getFreshImport(metric => metric.subscribe(({ value }) => {
      triggered++
      expect(value).toEqual(1)
      expect(triggered).toEqual(1)
      setTimeout(() => {
        expect(triggered).toEqual(1)
        done()
      }, 1000)
    }))
  })
})
