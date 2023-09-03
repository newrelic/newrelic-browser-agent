beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()

  const mockPerformanceObserver = jest.fn(cb => ({
    observe: () => {
      const callCb = () => {
        // eslint-disable-next-line
        cb({
          getEntries: () => ([{
            name: 'longtask',
            duration: 1,
            startTime: 1,
            attribution: [{
              containerType: 'object',
              containerSrc: 'src',
              containerId: 'id',
              containerName: 'name'
            }]
          }])
        })
        setTimeout(callCb, 250)
      }
      setTimeout(callCb, 250)
    },
    disconnect: jest.fn()
  }))
  global.PerformanceObserver = mockPerformanceObserver
  global.PerformanceObserver.supportedEntryTypes = ['longtask']
})

const getFreshLTImport = async (codeToRun) => {
  const { longTask } = await import('./long-task')
  codeToRun(longTask)
}

describe('lt', () => {
  test('reports lt', (done) => {
    getFreshLTImport(metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(1)
      expect(attrs).toMatchObject({
        ltFrame: 'longtask',
        ltStart: 1,
        ltCtr: 'object',
        ltCtrSrc: 'src',
        ltCtrId: 'id',
        ltCtrName: 'name'
      })
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshLTImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('does NOT report if browser does not support longtask', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))

    global.PerformanceObserver.supportedEntryTypes = ['paint']

    getFreshLTImport(metric => {
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
    let sub1, sub2
    getFreshLTImport(metric => {
      const remove1 = metric.subscribe(({ entries }) => {
        sub1 ??= entries[0].id
        if (sub1 === sub2) { remove1(); remove2(); done() }
      })

      const remove2 = metric.subscribe(({ entries }) => {
        sub2 ??= entries[0].id
        if (sub1 === sub2) { remove1(); remove2(); done() }
      })
    })
  })

  test('reports more than once', (done) => {
    jest.doMock('../constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: true
    }))
    let triggered = 0
    getFreshLTImport(metric => metric.subscribe(({ value }) => {
      triggered++
      expect(value).toEqual(1)
      expect(triggered).toEqual(1)
      setTimeout(() => {
        expect(triggered).toBeGreaterThanOrEqual(3)
        done()
      }, 1000)
    })
    )
  })
})
