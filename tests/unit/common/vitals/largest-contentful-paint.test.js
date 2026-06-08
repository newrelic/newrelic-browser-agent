beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
  jest.clearAllMocks()
})

const lcpAttribution = {
  lcpEntry: {
    size: 1,
    id: 'someid',
    element: { tagName: 'sometagName' }
  },
  element: '#someid',
  timeToFirstByte: 1,
  resourceLoadDelay: 2,
  resourceLoadDuration: 3,
  elementRenderDelay: 4,
  url: 'http://domain.com/page?k1=v1#hash'
}
let triggeronLCPCallback
const getFreshLCPImport = async (codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onLCP: jest.fn(cb => { triggeronLCPCallback = cb; cb({ value: 1, attribution: lcpAttribution }) })
  }))
  const { largestContentfulPaint } = await import('../../../../src/common/vitals/largest-contentful-paint')
  codeToRun(largestContentfulPaint)
}

const getFreshLCPImportWithAttribution = async (attribution, codeToRun) => {
  jest.doMock('web-vitals/attribution', () => ({
    onLCP: jest.fn(cb => { triggeronLCPCallback = cb; cb({ value: 1, attribution }) })
  }))
  const { largestContentfulPaint } = await import('../../../../src/common/vitals/largest-contentful-paint')
  codeToRun(largestContentfulPaint)
}

describe('lcp', () => {
  test('reports lcp from web-vitals', (done) => {
    getFreshLCPImport(metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(1)
      expect(attrs).toStrictEqual({
        size: lcpAttribution.lcpEntry.size,
        eid: lcpAttribution.lcpEntry.id,
        elUrl: 'http://domain.com/page', // url is cleaned so query & hash removed
        elTag: lcpAttribution.lcpEntry.element.tagName,
        element: lcpAttribution.element,
        timeToFirstByte: lcpAttribution.timeToFirstByte,
        resourceLoadDelay: lcpAttribution.resourceLoadDelay,
        resourceLoadDuration: lcpAttribution.resourceLoadDuration,
        resourceLoadTime: lcpAttribution.resourceLoadDuration,
        elementRenderDelay: lcpAttribution.elementRenderDelay
      })
      done()
    }))
  })

  test('reports LCP when lcpEntry is missing and uses provided default attribution values', (done) => {
    const fallbackAttribution = {
      // Mimic web-vitals fallback attribution when no lcp entry is available
      timeToFirstByte: 0,
      resourceLoadDelay: 0,
      resourceLoadDuration: 0,
      elementRenderDelay: 4
    }

    getFreshLCPImportWithAttribution(fallbackAttribution, metric => metric.subscribe(({ value, attrs }) => {
      expect(value).toEqual(1)
      expect(attrs).toStrictEqual({
        timeToFirstByte: 0,
        resourceLoadDelay: 0,
        resourceLoadDuration: 0,
        resourceLoadTime: 0,
        elementRenderDelay: 4
      })
      done()
    }))
  })

  test('does NOT report if not browser scoped', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      isBrowserScope: false
    }))

    getFreshLCPImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported...')
        expect(1).toEqual(2)
      })
      setTimeout(done, 1000)
    })
  })

  test('Does NOT report values if initiallyHidden', (done) => {
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      __esModule: true,
      initiallyHidden: true,
      isBrowserScope: true
    }))

    getFreshLCPImport(metric => {
      metric.subscribe(() => {
        console.log('should not have reported')
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
    getFreshLCPImport(metric => {
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
    getFreshLCPImport(metric => {
      metric.subscribe(({ value }) => {
        triggered++
        expect(value).toEqual(1)
        expect(triggered).toEqual(1)
      })
      triggeronLCPCallback({ value: 'notequal1' })
      expect(triggered).toEqual(1)
      done()
    })
  })
})
