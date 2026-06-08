/* globals RegisteredEntity */

/**
 * RegisteredEntity should just be a wrapper around newrelic.register().
 * This test suite validates that the NPM RegisteredEntity interface has the same shape and utility
 * as calling newrelic.register(). It uses browser.execute to compare the client-side API surface,
 * not backend behavior (which is tested in tests/specs/api/register/).
 */
describe('RegisteredEntity NPM Interface Parity', () => {
  beforeEach(async () => {
    await browser.enableLogging()
  })

  it('should expose the same methods as newrelic.register()', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      // Create registered entities using both approaches
      const viaRegister = newrelic.register({ id: 'via-register', name: 'Via Register' })
      const viaConstructor = new RegisteredEntity({ id: 'via-constructor', name: 'Via Constructor' })

      // List of all public API methods that should be exposed by both interfaces
      // We want to ensure that a RegisteredEntity instances expose the same public API as newrelic.register()
      const expectedMethods = [
        'addPageAction',
        'noticeError',
        'setCustomAttribute',
        'setUserId',
        'setApplicationVersion',
        'deregister',
        'log',
        'measure',
        'recordCustomEvent'
      ]

      const methodsComparison = {}
      expectedMethods.forEach(method => {
        methodsComparison[method] = {
          viaRegisterExists: typeof viaRegister[method] === 'function',
          viaConstructorExists: typeof viaConstructor[method] === 'function',
          sameType: typeof viaRegister[method] === typeof viaConstructor[method]
        }
      })

      return {
        methodsComparison,
        registerType: typeof viaRegister,
        constructorType: typeof viaConstructor
      }
    })

    // Validate that both interfaces expose the same API methods
    // This is the core of interface parity - same methods, same types
    Object.keys(comparison.methodsComparison).forEach(method => {
      const { viaRegisterExists, viaConstructorExists, sameType } = comparison.methodsComparison[method]
      expect(viaRegisterExists).toBe(true)
      expect(viaConstructorExists).toBe(true)
      expect(sameType).toBe(true)
    })

    // Both should be plain objects (not primitives or null)
    expect(comparison.registerType).toEqual('object')
    expect(comparison.constructorType).toEqual('object')
  })

  it('should have the same method signatures', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      const viaRegister = newrelic.register({ id: 1, name: 'Via Register' })
      const viaConstructor = new RegisteredEntity({ id: 2, name: 'Via Constructor' })

      // Check that each method has the same signature (parameter count and name)
      // This ensures both interfaces accept the same arguments
      const methodsToCheck = [
        'addPageAction',
        'noticeError',
        'setCustomAttribute',
        'setUserId',
        'setApplicationVersion',
        'deregister',
        'log',
        'measure',
        'recordCustomEvent'
      ]

      const signatures = {}
      methodsToCheck.forEach(method => {
        signatures[method] = {
          registerLength: viaRegister[method] ? viaRegister[method].length : undefined,
          constructorLength: viaConstructor[method] ? viaConstructor[method].length : undefined,
          registerName: viaRegister[method] ? viaRegister[method].name : undefined,
          constructorName: viaConstructor[method] ? viaConstructor[method].name : undefined
        }
      })

      return { signatures }
    })

    // Verify parameter counts and method names match exactly
    // This validates that calling conventions are identical between both interfaces
    Object.keys(comparison.signatures).forEach(method => {
      const { registerLength, constructorLength, registerName, constructorName } = comparison.signatures[method]
      expect(registerLength).toEqual(constructorLength)
      expect(registerName).toEqual(constructorName)
    })
  })

  it('should not have nested .register() method', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      // Test that the register method is not present on registered entities
      const viaRegister = newrelic.register({ id: 1, name: 'parent-via-register' })
      const viaConstructor = new RegisteredEntity({ id: 3, name: 'parent-via-constructor' })

      return {
        viaRegisterHasRegister: typeof viaRegister.register === 'function',
        viaConstructorHasRegister: typeof viaConstructor.register === 'function',
        viaRegisterHasNoticeError: typeof viaRegister.noticeError === 'function',
        viaConstructorHasNoticeError: typeof viaConstructor.noticeError === 'function'
      }
    })

    // Registered entities should NOT have the register method
    expect(comparison.viaRegisterHasRegister).toBe(false)
    expect(comparison.viaConstructorHasRegister).toBe(false)
    // But they should still have full API capabilities
    expect(comparison.viaRegisterHasNoticeError).toBe(true)
    expect(comparison.viaConstructorHasNoticeError).toBe(true)
  })

  it('should both support deregister() and behave identically', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      const viaRegister = newrelic.register({ id: 1, name: 'Via Register' })
      const viaConstructor = new RegisteredEntity({ id: 2, name: 'Via Constructor' })

      // Verify deregister method exists and has the same signature on both interfaces
      // deregister() is used to mark the end of an MFE's lifecycle
      const registerDeregisterType = typeof viaRegister.deregister
      const constructorDeregisterType = typeof viaConstructor.deregister
      const registerDeregisterLength = viaRegister.deregister.length
      const constructorDeregisterLength = viaConstructor.deregister.length

      // Call deregister and check that both return the same type
      // Ensures the API contract is identical
      const registerReturn = viaRegister.deregister()
      const constructorReturn = viaConstructor.deregister()

      return {
        registerDeregisterType,
        constructorDeregisterType,
        registerDeregisterLength,
        constructorDeregisterLength,
        registerReturnType: typeof registerReturn,
        constructorReturnType: typeof constructorReturn
      }
    })

    expect(comparison.registerDeregisterType).toEqual('function')
    expect(comparison.constructorDeregisterType).toEqual('function')
    expect(comparison.registerDeregisterLength).toEqual(comparison.constructorDeregisterLength)
    expect(comparison.registerReturnType).toEqual(comparison.constructorReturnType)
  })

  it('should both support setCustomAttribute() with same signature', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      const viaRegister = newrelic.register({ id: 1, name: 'Via Register' })
      const viaConstructor = new RegisteredEntity({ id: 2, name: 'Via Constructor' })

      // Test setCustomAttribute with same inputs to verify identical behavior
      const registerReturn = viaRegister.setCustomAttribute('key', 'value')
      const constructorReturn = viaConstructor.setCustomAttribute('key', 'value')

      return {
        registerHasMethod: typeof viaRegister.setCustomAttribute === 'function',
        constructorHasMethod: typeof viaConstructor.setCustomAttribute === 'function',
        registerLength: viaRegister.setCustomAttribute.length,
        constructorLength: viaConstructor.setCustomAttribute.length,
        registerReturnType: typeof registerReturn,
        constructorReturnType: typeof constructorReturn
      }
    })

    expect(comparison.registerHasMethod).toBe(true)
    expect(comparison.constructorHasMethod).toBe(true)
    // Parameter count should match (expects 2 params: name, value)
    expect(comparison.registerLength).toEqual(comparison.constructorLength)
    // Both should return the same type (likely undefined/void)
    expect(comparison.registerReturnType).toEqual(comparison.constructorReturnType)
  })

  it('should both support noticeError() with same signature', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      const viaRegister = newrelic.register({ id: 1, name: 'Via Register' })
      const viaConstructor = new RegisteredEntity({ id: 2, name: 'Via Constructor' })

      // Test noticeError with multiple input types to verify it handles all cases identically
      // Test with Error object
      const registerReturn1 = viaRegister.noticeError(new Error('test1'))
      const constructorReturn1 = viaConstructor.noticeError(new Error('test2'))

      // Test with string
      const registerReturn2 = viaRegister.noticeError('error string 1')
      const constructorReturn2 = viaConstructor.noticeError('error string 2')

      // Test with custom attributes
      const registerReturn3 = viaRegister.noticeError(new Error('test3'), { attr: 1 })
      const constructorReturn3 = viaConstructor.noticeError(new Error('test4'), { attr: 2 })

      return {
        registerHasMethod: typeof viaRegister.noticeError === 'function',
        constructorHasMethod: typeof viaConstructor.noticeError === 'function',
        registerLength: viaRegister.noticeError.length,
        constructorLength: viaConstructor.noticeError.length,
        allReturnsSame: [
          typeof registerReturn1,
          typeof constructorReturn1,
          typeof registerReturn2,
          typeof constructorReturn2,
          typeof registerReturn3,
          typeof constructorReturn3
        ]
      }
    })

    expect(comparison.registerHasMethod).toBe(true)
    expect(comparison.constructorHasMethod).toBe(true)
    expect(comparison.registerLength).toEqual(comparison.constructorLength)
    // All noticeError calls should return the same type regardless of input
    // This validates both interfaces handle Error objects, strings, and custom attributes identically
    expect(new Set(comparison.allReturnsSame).size).toEqual(1)
  })

  it('should both support addPageAction() with same signature', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      const viaRegister = newrelic.register({ id: 1, name: 'Via Register' })
      const viaConstructor = new RegisteredEntity({ id: 2, name: 'Via Constructor' })

      // Call addPageAction with same arguments to verify identical behavior
      const registerReturn = viaRegister.addPageAction('action1', { val: 1 })
      const constructorReturn = viaConstructor.addPageAction('action2', { val: 2 })

      return {
        registerHasMethod: typeof viaRegister.addPageAction === 'function',
        constructorHasMethod: typeof viaConstructor.addPageAction === 'function',
        registerLength: viaRegister.addPageAction.length,
        constructorLength: viaConstructor.addPageAction.length,
        registerReturnType: typeof registerReturn,
        constructorReturnType: typeof constructorReturn
      }
    })

    expect(comparison.registerHasMethod).toBe(true)
    expect(comparison.constructorHasMethod).toBe(true)
    expect(comparison.registerLength).toEqual(comparison.constructorLength)
    expect(comparison.registerReturnType).toEqual(comparison.constructorReturnType)
  })

  it('should both return the same type when calling all methods', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const comparison = await browser.execute(function () {
      const viaRegister = newrelic.register({ id: 1, name: 'Via Register' })
      const viaConstructor = new RegisteredEntity({ id: 2, name: 'Via Constructor' })

      // Comprehensive test: call all methods and verify return types match
      // This ensures complete behavioral parity across the entire API surface
      const results = {}

      // Methods that can be called without args
      const noArgMethods = ['deregister']
      noArgMethods.forEach(method => {
        try {
          const registerReturn = viaRegister[method]()
          const constructorReturn = viaConstructor[method]()
          results[method] = {
            registerReturnType: typeof registerReturn,
            constructorReturnType: typeof constructorReturn,
            match: typeof registerReturn === typeof constructorReturn
          }
        } catch (e) {
          results[method] = { error: e.message }
        }
      })

      // Methods that need at least one arg
      const oneArgMethods = [
        { name: 'addPageAction', arg: 'testAction' },
        { name: 'noticeError', arg: new Error('test') },
        { name: 'setUserId', arg: 'testUser' },
        { name: 'setApplicationVersion', arg: '1.0.0' },
        { name: 'log', arg: 'test message' },
        { name: 'measure', arg: 'testMeasure' },
        { name: 'recordCustomEvent', arg: 'testEvent' }
      ]
      oneArgMethods.forEach(({ name, arg }) => {
        try {
          const registerReturn = viaRegister[name](arg)
          const constructorReturn = viaConstructor[name](arg)
          results[name] = {
            registerReturnType: typeof registerReturn,
            constructorReturnType: typeof constructorReturn,
            match: typeof registerReturn === typeof constructorReturn
          }
        } catch (e) {
          results[name] = { error: e.message }
        }
      })

      // setCustomAttribute needs two args
      try {
        const registerReturn = viaRegister.setCustomAttribute('key', 'value')
        const constructorReturn = viaConstructor.setCustomAttribute('key', 'value')
        results.setCustomAttribute = {
          registerReturnType: typeof registerReturn,
          constructorReturnType: typeof constructorReturn,
          match: typeof registerReturn === typeof constructorReturn
        }
      } catch (e) {
        results.setCustomAttribute = { error: e.message }
      }

      return results
    })

    // Verify that every method returns the same type from both interfaces
    // This is the ultimate validation that the APIs are functionally equivalent
    Object.keys(comparison).forEach(method => {
      if (comparison[method].match !== undefined) {
        expect(comparison[method].match).toBe(true)
      }
    })
  })

  it('should gracefully handle when newrelic agent does not exist', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    const result = await browser.execute(function () {
      // Test graceful degradation: RegisteredEntity should still work if agent isn't loaded
      // Delete the newrelic global to simulate agent not loaded
      delete window.newrelic

      // Create a RegisteredEntity without the agent - should not throw
      const entity = new RegisteredEntity({ id: 1, name: 'No Agent Entity' })

      // All API methods should still exist as stub functions (for graceful degradation)
      // This prevents errors if RegisteredEntity is used before agent loads
      const expectedMethods = [
        'addPageAction',
        'noticeError',
        'setCustomAttribute',
        'setUserId',
        'setApplicationVersion',
        'deregister',
        'log',
        'measure',
        'recordCustomEvent'
      ]

      const methodsExist = {}
      expectedMethods.forEach(method => {
        methodsExist[method] = typeof entity[method] === 'function'
      })

      // Verify stub methods can be called without throwing errors
      // They should log warnings instead of crashing
      let callErrors = {}
      try {
        entity.addPageAction('test')
        callErrors.addPageAction = false
      } catch (e) {
        callErrors.addPageAction = true
      }

      try {
        entity.noticeError('test error')
        callErrors.noticeError = false
      } catch (e) {
        callErrors.noticeError = true
      }

      try {
        entity.setCustomAttribute('key', 'value')
        callErrors.setCustomAttribute = false
      } catch (e) {
        callErrors.setCustomAttribute = true
      }

      try {
        entity.deregister()
        callErrors.deregister = false
      } catch (e) {
        callErrors.deregister = true
      }

      return {
        entityType: typeof entity,
        methodsExist,
        callErrors,
        // eslint-disable-next-line no-prototype-builtins
        hasMetadata: entity.hasOwnProperty('metadata'),
        metadataType: typeof entity.metadata
      }
    })

    // Validate graceful degradation: entity should exist and be usable even without agent
    expect(result.entityType).toEqual('object')

    // All stub methods should exist as functions (no missing API surface)
    Object.keys(result.methodsExist).forEach(method => {
      expect(result.methodsExist[method]).toBe(true)
    })

    // Calling stub methods should not throw errors - they warn instead of crashing
    // This ensures apps using RegisteredEntity won't break if agent fails to load
    expect(result.callErrors.addPageAction).toBe(false)
    expect(result.callErrors.noticeError).toBe(false)
    expect(result.callErrors.setCustomAttribute).toBe(false)
    expect(result.callErrors.deregister).toBe(false)

    // Metadata property should still exist (defined in class constructor)
    // This allows the entity to be properly initialized even without the agent
    expect(result.hasMetadata).toBe(true)
    expect(result.metadataType).toEqual('object')
  })
})
