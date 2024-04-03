import { stylesheetEvaluator } from '../../../../../src/features/session_replay/shared/stylesheet-evaluator'

let stylesheet

describe('stylesheet-evaluator', (done) => {
  beforeEach(async () => {
    stylesheet = new CSSStyleSheet()
    stylesheet.href = 'https://test.com'

    const globalScope = await import('../../../../../src/common/config/state/originals')
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
      replace (txt) {
        return new Promise((resolve) => {
          this.cssRules = { txt }
          this.rules = { txt }
          resolve()
        })
      }
    }
    global.CSSStyleSheet = CSSStyleSheetMock
  })
  it('should evaluate stylesheets with cssRules as false', async () => {
    prepStylesheet({
      get () { return 'success' }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(0)
  })

  it('should evaluate stylesheets without cssRules as true', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(1)
  })

  it('should evaluate stylesheets once', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(1)
    expect(stylesheetEvaluator.evaluate()).toEqual(0)
  })

  it('should execute fix single', async () => {
    prepStylesheet({
      get () { return 'success' }
    })
    stylesheetEvaluator.evaluate()
    await stylesheetEvaluator.fix()
    expect(document.styleSheets[0].cssRules).toEqual(stylesheet.cssRules)
  })

  it('should resolve as false if not browserScope', async () => {
    jest.resetModules()
    jest.doMock('../../../../../src/common/constants/runtime', () => ({
      globalScope: {},
      isBrowserScope: false
    }))
    const { stylesheetEvaluator } = await import('../../../../../src/features/session_replay/shared/stylesheet-evaluator')
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(0)
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
