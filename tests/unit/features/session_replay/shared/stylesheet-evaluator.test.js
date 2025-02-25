import { stylesheetEvaluator } from '../../../../../src/features/session_replay/shared/stylesheet-evaluator'

let stylesheet

describe('stylesheet-evaluator', (done) => {
  beforeEach(async () => {
    stylesheet = new CSSStyleSheet()
    stylesheet.href = 'https://test.com'

    jest.doMock('../../../../../src/common/window/nreum', () => ({
      __esModule: true,
      gosNREUMOriginals: jest.fn(() => ({
        o: {
          FETCH: jest.fn(() =>
            Promise.resolve({
              text: () => Promise.resolve('myCssText{width:1}')
            })
          )
        }
      }))
    }))
  })

  test('should evaluate stylesheets with cssRules as false', async () => {
    prepStylesheet({
      get () { return 'success' }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(0)
  })

  test('should evaluate stylesheets without cssRules as true', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(1)
  })

  test('should evaluate stylesheets once', async () => {
    prepStylesheet({
      get () {
        throw new Error()
      }
    })
    expect(stylesheetEvaluator.evaluate()).toEqual(1)
    expect(stylesheetEvaluator.evaluate()).toEqual(0)
  })

  test('should execute fix single', async () => {
    prepStylesheet({
      get () { return 'success' }
    })
    stylesheetEvaluator.evaluate()
    await stylesheetEvaluator.fix()
    expect(document.styleSheets[0].cssRules).toEqual(stylesheet.cssRules)
  })

  test('should resolve as false if not browserScope', async () => {
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

  test('should not throw error if null prop in global', async () => {
    jest.resetModules()
    const { stylesheetEvaluator } = await import('../../../../../src/features/session_replay/shared/stylesheet-evaluator')
    Object.defineProperty(document, 'styleSheets', {
      value: {
        0: null
      },
      configurable: true
    })
    expect(() => stylesheetEvaluator.evaluate()).not.toThrow()
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
