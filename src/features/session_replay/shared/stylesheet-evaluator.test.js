import { stylesheetEvaluator } from './stylesheet-evaluator'

let stylesheet

describe('stylesheet-evaluator', (done) => {
  beforeEach(() => {
    stylesheet = new CSSStyleSheet()
    stylesheet.href = 'https://test.com'
  })
  it('should evaluate stylesheets with cssRules as false', async () => {
    prepStylesheet({
      get () { return 'success' }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual([])
  })

  it('should evaluate stylesheets without cssRules as true', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual([{ ss: stylesheet, i: 0 }])
  })

  it('should evaluate stylesheets once', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual([{ ss: stylesheet, i: 0 }])
    expect(stylesheetEvaluator.evaluate()).toEqual([])
  })

  it('should execute fix single', async () => {
    const globalScope = await import('../../../common/config/state/originals')
    jest.replaceProperty(globalScope, 'originals', {
      FETCH: jest.fn(() =>
        Promise.resolve({
          text: () => Promise.resolve('myCssText{width:1}')
        })
      )
    })
    class CSSStyleSheetMock {
      cssRules = {}
      rules = {}
      replaceSync (txt) {
        this.cssRules = { txt }
        this.rules = { txt }
      }
    }
    global.CSSStyleSheet = CSSStyleSheetMock
    prepStylesheet({
      get () { return 'success' }
    })
    const proms = stylesheetEvaluator.fix([{ ss: stylesheet, i: 0 }])
    expect(proms).toResolve()
    expect(document.styleSheets[0].cssRules).toEqual(stylesheet.cssRules)
  })

  it('should resolve as false if not browserScope', async () => {
    jest.resetModules()
    jest.doMock('../../../common/constants/runtime', () => ({
      globalScope: {},
      isBrowserScope: false
    }))
    const { stylesheetEvaluator } = await import('./stylesheet-evaluator')
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual([])
  })
})

function prepStylesheet (cssRules) {
  Object.defineProperty(stylesheet, 'cssRules', cssRules)
  Object.defineProperty(document, 'styleSheets', {
    value: {
      0: stylesheet,
      [Symbol.iterator]: function * () {
        for (let key in this) {
          yield this[key] // yield [key, value] pair
        }
      }
    },
    configurable: true
  })
}
