let registerDrain, drain, deregisterDrain, ee, registerHandler
beforeEach(async () => {
  jest.resetModules()
  ;({ registerDrain, drain, deregisterDrain } = await import('../../../../src/common/drain/drain'))
  ;({ ee } = await import('../../../../src/common/event-emitter/contextual-ee'))
  ;({ registerHandler } = await import('../../../../src/common/event-emitter/register-handler'))
})

// Helper function to create agent reference objects for tests
const createAgentRef = (agentIdentifier) => ({
  agentIdentifier,
  ee: ee.get(agentIdentifier),
  runtime: {
    drainRegistry: new Map()
  }
})

test('can register a feat and drain it', () => {
  const agentRef = createAgentRef('abcd')
  registerDrain(agentRef, 'page_view_event')

  let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
  drain(agentRef, 'page_view_event')
  expect(emitSpy).toHaveBeenCalledWith('drain-page_view_event', expect.anything())
})

test('will not execute .on if the object is not an EE', () => {
  const agentRef = createAgentRef('abcd')
  registerHandler('tusks', () => {}, 'page_view_event', ee.get('abcd'))
  registerDrain(agentRef, 'page_view_event')
  let valuesSpy = jest.spyOn(Object, 'values').mockImplementation(() => [[{ foo: 'bar' }]])
  let emitSpy = jest.spyOn(ee.get('abcd'), 'on')
  drain(agentRef, 'page_view_event')
  expect(valuesSpy).toHaveBeenCalled()
  expect(emitSpy).not.toHaveBeenCalled()
})

test('other unregistered drains do not affect feat reg & drain', () => {
  const agentRef = createAgentRef('abcd')
  registerDrain(agentRef, 'page_view_event')

  let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
  drain(agentRef, 'timon')
  expect(emitSpy).toHaveBeenCalledWith('drain-timon', expect.anything())
  expect(emitSpy).not.toHaveBeenCalledWith('drain-page_view_event', expect.anything())

  drain(agentRef, 'page_view_event')
  expect(emitSpy).toHaveBeenCalledWith('drain-page_view_event', expect.anything())
})

test('unregistering groups clears their handlers from the buffering system', () => {
  const agentRef = createAgentRef('abcd')
  registerDrain(agentRef, 'pumbaa')
  registerHandler('tusks', () => {}, 'pumbaa', ee)
  expect(registerHandler.handlers.pumbaa).toEqual({ tusks: expect.anything() })

  deregisterDrain(agentRef, 'pumbaa')
  expect(registerHandler.handlers.pumbaa).toBeUndefined()
})

describe('drain', () => {
  test('does not execute until all registered groups calls it and in order', () => {
    const agentRef = createAgentRef('abcd')
    registerDrain(agentRef, 'page_view_timing')
    registerDrain(agentRef, 'page_view_event')

    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain(agentRef, 'page_view_event')
    expect(emitSpy).not.toHaveBeenCalled()

    drain(agentRef, 'page_view_timing')
    // The priority order of features is also checked here, even though the latter was registered first.
    expect(emitSpy).toHaveBeenNthCalledWith(1, 'drain-page_view_event', expect.anything())
    expect(emitSpy).toHaveBeenNthCalledWith(2, 'drain-page_view_timing', expect.anything())
  })

  test('does not require registration for non-feat groups', () => {
    const agentRef = createAgentRef('abcd')
    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain(agentRef, 'pumbaa')
    expect(emitSpy).toHaveBeenCalledWith('drain-pumbaa', expect.anything())
  })

  test('immediately drains when force is true', () => {
    const agentRef = createAgentRef('abcd')
    registerDrain(agentRef, 'page_view_timing')
    registerDrain(agentRef, 'page_view_event')

    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain(agentRef, 'page_view_event', true)
    expect(emitSpy).toHaveBeenNthCalledWith(1, 'drain-page_view_event', expect.anything())
  })

  test('defaults to "feature" group when not provided one', () => {
    const agentRef = createAgentRef('abcd')
    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain(agentRef)
    expect(emitSpy).toHaveBeenCalledWith('drain-feature', expect.anything())
  })
})

test('non-feat groups can register and drain too alongside features', () => {
  const agentRef = createAgentRef('abcd')
  registerDrain(agentRef, 'page_view_event')
  registerDrain(agentRef, 'simba')

  let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
  drain(agentRef, 'simba')
  expect(emitSpy).not.toHaveBeenCalled()

  drain(agentRef, 'page_view_event')
  expect(emitSpy).toHaveBeenNthCalledWith(1, 'drain-simba', expect.anything()) // non-feat have prio of 0
  expect(emitSpy).toHaveBeenNthCalledWith(2, 'drain-page_view_event', expect.anything())
})
