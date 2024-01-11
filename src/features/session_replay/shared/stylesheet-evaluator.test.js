import { stylesheetEvaluator } from './stylesheet-evaluator'

describe('stylesheet-evaluator', (done) => {
  it('should evaluate stylesheets with cssRules as false', async () => {
    prepStylesheet({
      get () { return 'success' }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(false)
  })

  it('should evaluate stylesheets without cssRules as true', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(true)
  })

  it('should evaluate stylesheets once', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(true)
    expect(stylesheetEvaluator.evaluate()).toEqual(false)
  })

  it('should resolve as false if not browserScope', async () => {
    jest.resetModules()
    jest.doMock('../../../common/constants/runtime', () => ({
      isBrowserScope: false
    }))
    const { stylesheetEvaluator } = await import('./stylesheet-evaluator')
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(false)
  })
})

function prepStylesheet (cssRules) {
  const stylesheet = new CSSStyleSheet()
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
