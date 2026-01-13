/**
 * The webdriver detection module exports a variable whose value is set at the time of import
 * and depends on the environment the agent is running within. To make testing this module
 * easier, use async import to import the module and only use the node jest environment so
 * we can more easily define environment variables.
 * @jest-environment node
 */

beforeEach(() => {
  // Reset all global properties before each test
  delete global.navigator
  delete global.window
  delete global.document
  jest.resetModules()
})

afterEach(() => {
  // Clean up after each test
  delete global.navigator
  delete global.window
  delete global.document
})

describe('webdriverDetected', () => {
  it('should detect when navigator.webdriver is true', async () => {
    global.navigator = { webdriver: true }
    global.window = {}
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should not detect when navigator.webdriver is false', async () => {
    global.navigator = { webdriver: false }
    global.window = {}
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(false)
  })

  it('should detect when document.__webdriver_evaluate exists', async () => {
    global.navigator = {}
    global.window = {}
    global.document = { __webdriver_evaluate: true }

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should detect when document.__selenium_unwrapped exists', async () => {
    global.navigator = {}
    global.window = {}
    global.document = { __selenium_unwrapped: {} }

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should detect when document.__driver_evaluate exists', async () => {
    global.navigator = {}
    global.window = {}
    global.document = { __driver_evaluate: {} }

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should detect when document.__webdriver_script_function exists', async () => {
    global.navigator = {}
    global.window = {}
    global.document = { __webdriver_script_function: {} }

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should detect when window.callPhantom exists (PhantomJS)', async () => {
    global.navigator = {}
    global.window = { callPhantom: {} }
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should detect when window._phantom exists (PhantomJS)', async () => {
    global.navigator = {}
    global.window = { _phantom: {} }
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should detect when window.__nightmare exists (Nightmare.js)', async () => {
    global.navigator = {}
    global.window = { __nightmare: {} }
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })

  it('should not detect webdriver in a clean environment', async () => {
    global.navigator = {}
    global.window = {}
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(false)
  })

  it('should handle missing navigator gracefully', async () => {
    global.window = {}
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(false)
  })

  it('should handle missing window gracefully', async () => {
    global.navigator = {}
    global.document = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(false)
  })

  it('should handle missing document gracefully', async () => {
    global.navigator = {}
    global.window = {}

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(false)
  })

  it('should handle errors during detection gracefully', async () => {
    global.navigator = {}
    global.window = {}
    Object.defineProperty(global, 'document', {
      get () {
        throw new Error('Access denied')
      },
      configurable: true
    })

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(false)
  })

  it('should detect multiple webdriver indicators', async () => {
    global.navigator = { webdriver: true }
    global.window = { callPhantom: {}, _phantom: {} }
    global.document = {
      __webdriver_evaluate: true,
      __selenium_unwrapped: {}
    }

    const { webdriverDetected } = await import('../../../../src/common/util/webdriver-detection')

    expect(webdriverDetected).toBe(true)
  })
})
