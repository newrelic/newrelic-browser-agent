import { faker } from '@faker-js/faker'

const globalScopeLocation = 'https://example.com/'

const mockGlobalScopeLocation = (url) => {
  jest.doMock('../../../common/constants/runtime', () => ({
    initialLocation: url || globalScopeLocation
  }))
}
const constructError = (errorData) => {
  const error = Object.create(new Error(errorData.message))

  return new Proxy(error, {
    get (target, prop) {
      if (prop === 'toString') {
        return () => errorData[prop]
      }

      return errorData[prop]
    },
    has (target, key) {
      return key in target || key in errorData
    }
  })
}

afterEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

const baseMockError = {
  toString: 'RangeError: Invalid array length',
  name: 'RangeError',
  constructor: 'function RangeError() { [native code] }',
  message: 'Invalid array length',
  stack:
    'RangeError: Invalid array length\n' +
    '    at errorTest (' + globalScopeLocation + '?loader=spa#hello:74:16)\n' +
    '    at captureError (' + globalScopeLocation + 'js/script.js?loader=spa:17:9)\n' +
    '    at onload (' + globalScopeLocation + 'js/script.js?loader=spa:70:5)'
}

test('parsing should return a failure for a null error object', async () => {
  mockGlobalScopeLocation()
  const { computeStackTrace } = await import('./compute-stack-trace')
  const result = computeStackTrace(null)

  expect(result).toEqual(expect.objectContaining({
    mode: 'failed',
    stackString: '',
    frames: []
  }))
})

describe('errors with stack property', () => {
  test('should show <inline> for same-page stack string URLs but not sub-paths', async () => {
    const mockError = constructError({
      ...baseMockError
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      stackString: // canonicalized
        'RangeError: Invalid array length\n' +
        '    at errorTest (<inline>:74:16)\n' +
        '    at captureError (' + globalScopeLocation + 'js/script.js:17:9)\n' +
        '    at onload (' + globalScopeLocation + 'js/script.js:70:5)'
    }))
  })

  test('parsed name should be unknown when name and constructor are missing', async () => {
    const mockError = constructError({
      ...baseMockError,
      name: null,
      constructor: null
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'stack',
      name: 'unknown'
    }))
  })

  test('parsed stack should not contain nrWrapper', async () => {
    const alteredError = baseMockError
    alteredError.stack +=
      '\n    at nrWrapper (' + globalScopeLocation + '?loader=spa:60:17)'
    const mockError = constructError(alteredError)

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'stack',
      name: mockError.name,
      message: mockError.message,
      stackString: expect.not.stringContaining('nrWrapper')
    }))
    expect(result.frames).not.toContainEqual(expect.objectContaining({
      func: 'nrWrapper'
    }))
  })

  test('stack should still parse when column numbers are missing', async () => {
    const mockError = constructError({
      ...baseMockError,
      stack:
      'RangeError: Invalid array length\n' +
      'Error: Blocked a frame with origin "http://bam-test-1.nr-local.net:3334" from accessing a cross-origin frame.\n' +
      '    at errorTest (' + globalScopeLocation + '?loader=spa:60)\n' +
      '    at captureError (' + globalScopeLocation + '?loader=spa:17)\n' +
      '    at onload (' + globalScopeLocation + '?loader=spa:57)'
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'stack',
      name: mockError.name,
      message: mockError.message,
      stackString:
        'RangeError: Invalid array length\n' +
        'Error: Blocked a frame with origin "http://bam-test-1.nr-local.net:3334" from accessing a cross-origin frame.\n' +
        '    at errorTest (<inline>:60)\n' +
        '    at captureError (<inline>:17)\n' +
        '    at onload (<inline>:57)'
    }))
    expect(result.frames.length).toEqual(3)
    expect(result.frames).toContainEqual(expect.objectContaining({
      func: 'errorTest',
      column: null
    }))
    expect(result.frames).toContainEqual(expect.objectContaining({
      func: 'captureError',
      column: null
    }))
    expect(result.frames).toContainEqual(expect.objectContaining({
      func: 'onload',
      column: null
    }))
  })

  test('parser can handle chrome eval stack', async () => {
    const mockError = constructError({
      ...baseMockError,
      stack:
        '    at foobar (eval at foobar (' + globalScopeLocation + '))'
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'stack',
      name: mockError.name,
      message: mockError.message,
      stackString: mockError.stack
    }))
    expect(result.frames.length).toEqual(1)
    expect(result.frames).toContainEqual(expect.objectContaining({
      func: 'evaluated code'
    }))
  })

  test('parser can handle ie eval stack', async () => {
    const mockError = constructError({
      toString: 'TypeError: Permission denied',
      name: 'TypeError',
      constructor: '\nfunction TypeError() {\n    [native code]\n}\n',
      message: 'Permission denied',
      stack:
        '    at Function code (Function code:23:23)'
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'stack',
      name: mockError.name,
      message: mockError.message,
      stackString: mockError.stack
    }))
    expect(result.frames.length).toEqual(1)
    expect(result.frames).toContainEqual(expect.objectContaining({
      func: 'evaluated code'
    }))
  })

  test('parser can handle stack with anonymous function', async () => {
    const mockError = constructError({
      ...baseMockError,
      stack:
        'anonymous'
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'stack',
      name: mockError.name,
      message: mockError.message,
      stackString: mockError.stack
    }))
    expect(result.frames.length).toEqual(1)
    expect(result.frames).toContainEqual(expect.objectContaining({
      func: 'evaluated code'
    }))
  })
})

describe('errors without stack property and with line property', () => {
  /**
   * @deprecated sourceURL is no longer present in errors for any browsers we support
   */
  test('parsed stack should contain sourceURL and line number', async () => {
    const sourceURL = faker.internet.url()
    const mockError = constructError({
      ...baseMockError,
      stack: undefined,
      line: 100,
      sourceURL
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'sourceline',
      name: mockError.name,
      message: mockError.message,
      stackString: `${mockError.name}: ${mockError.message}\n    at ${sourceURL}:${mockError.line}`
    }))
    expect(result.frames.length).toEqual(1)
    expect(result.frames).toContainEqual(expect.objectContaining({
      url: sourceURL,
      line: mockError.line
    }))
  })

  /**
   * @deprecated sourceURL is no longer present in errors for any browsers we support
   */
  test('parsed stack should contain sourceURL, line number, and column number', async () => {
    const sourceURL = faker.internet.url()
    const mockError = constructError({
      ...baseMockError,
      line: 100,
      column: 200,
      stack: undefined,
      sourceURL
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'sourceline',
      name: mockError.name,
      message: mockError.message,
      stackString: `${mockError.name}: ${mockError.message}\n    at ${sourceURL}:${mockError.line}:${mockError.column}`
    }))
    expect(result.frames.length).toEqual(1)
    expect(result.frames).toContainEqual(expect.objectContaining({
      url: sourceURL,
      line: mockError.line,
      column: mockError.column
    }))
  })

  test('parsed stack should contain "evaluated code" if sourceURL property is not present', async () => {
    const mockError = constructError({
      ...baseMockError,
      line: 100,
      column: 200,
      stack: undefined
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'sourceline',
      name: mockError.name,
      message: mockError.message,
      stackString: `RangeError: ${mockError.message}\n    in evaluated code`
    }))
    expect(result.frames.length).toEqual(1)
    expect(result.frames).toContainEqual(expect.objectContaining({
      func: 'evaluated code'
    }))
  })

  /**
   * @deprecated sourceURL is no longer present in errors for any browsers we support
   */
  test('should show <inline> for same-page URLs', async () => {
    const pageLocation = faker.internet.url()
    const sourceURL = pageLocation + '?abc=123'
    const mockError = constructError({
      ...baseMockError,
      line: 100,
      column: 200,
      stack: undefined,
      sourceURL
    })

    mockGlobalScopeLocation(pageLocation)
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      stackString: `${mockError.name}: ${mockError.message}\n    at <inline>:${mockError.line}:${mockError.column}`
    }))
    expect(result.frames).toContainEqual(expect.objectContaining({
      url: '<inline>'
    }))
  })

  /**
   * @deprecated sourceURL is no longer present in errors for any browsers we support
   */
  test('should NOT show <inline> for same-domain URLs with a sub-path', async () => {
    const pageLocation = faker.internet.url()
    const sourceURL = pageLocation + '/path/to/script.js'
    const mockError = constructError({
      ...baseMockError,
      line: 100,
      column: 200,
      stack: undefined,
      sourceURL
    })

    mockGlobalScopeLocation(pageLocation)
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      stackString: `${mockError.name}: ${mockError.message}\n    at ${sourceURL}:${mockError.line}:${mockError.column}`
    }))
    expect(result.frames).toContainEqual(expect.objectContaining({
      url: sourceURL
    }))
  })

  // TODO: computeStackTraceBySourceAndLine does not respect firefox lineNumber and columnNumber properties when stack is empty
})

/**
 * These tests are here because JS allows you to throw absolutely anything as an
 * error, including primitives.
 */
describe('errors that are messages only or primitives', () => {
  test('parser should get error name from constructor', async () => {
    const mockError = constructError({
      toString: '0',
      constructor: 'function Number() { [native code] }'
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'nameonly',
      name: 'Number',
      stackString: 'Number: undefined',
      frames: []
    }))
  })

  test('parser should get error name from name property', async () => {
    const mockError = constructError({
      toString: '0',
      name: faker.string.uuid(),
      constructor: 'function Number() { [native code] }'
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'nameonly',
      name: mockError.name,
      stackString: `${mockError.name}: undefined`,
      frames: []
    }))
  })

  test('parser should include the message property', async () => {
    const mockError = constructError({
      toString: '0',
      name: faker.string.uuid(),
      message: faker.string.uuid(),
      constructor: 'function Number() { [native code] }'
    })

    mockGlobalScopeLocation()
    const { computeStackTrace } = await import('./compute-stack-trace')
    const result = computeStackTrace(mockError)

    expect(result).toEqual(expect.objectContaining({
      mode: 'nameonly',
      name: mockError.name,
      message: mockError.message,
      stackString: `${mockError.name}: ${mockError.message}`,
      frames: []
    }))
  })
})
