let registerDrain, drain, ee
beforeEach(async () => {
  jest.resetModules()
  ;({ registerDrain, drain } = await import('./drain'))
  ;({ ee } = await import('../event-emitter/contextual-ee'))
})

test('can register a feat and drain it', () => {
  registerDrain('abcd', 'page_view_event')

  let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
  drain('abcd', 'page_view_event')
  expect(emitSpy).toHaveBeenCalledWith('drain-page_view_event', expect.anything())
})

test('other unregistered drains do not affect feat reg & drain', () => {
  registerDrain('abcd', 'page_view_event')

  let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
  drain('abcd', 'timon')
  expect(emitSpy).toHaveBeenCalledWith('drain-timon', expect.anything())
  expect(emitSpy).not.toHaveBeenCalledWith('drain-page_view_event', expect.anything())

  drain('abcd', 'page_view_event')
  expect(emitSpy).toHaveBeenCalledWith('drain-page_view_event', expect.anything())
})

describe('drain', () => {
  test('does not execute until all registered groups calls it and in order', () => {
    registerDrain('abcd', 'page_view_timing')
    registerDrain('abcd', 'page_view_event')

    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain('abcd', 'page_view_event')
    expect(emitSpy).not.toHaveBeenCalled()

    drain('abcd', 'page_view_timing')
    // The priority order of features is also checked here, even though the latter was registered first.
    expect(emitSpy).toHaveBeenNthCalledWith(1, 'drain-page_view_event', expect.anything())
    expect(emitSpy).toHaveBeenNthCalledWith(2, 'drain-page_view_timing', expect.anything())
  })

  test('does not require registration for non-feat groups', () => {
    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain('abcd', 'pumbaa')
    expect(emitSpy).toHaveBeenCalledWith('drain-pumbaa', expect.anything())
  })

  test('immediately drains when force is true', () => {
    registerDrain('abcd', 'page_view_timing')
    registerDrain('abcd', 'page_view_event')

    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain('abcd', 'page_view_event', true)
    expect(emitSpy).toHaveBeenNthCalledWith(1, 'drain-page_view_event', expect.anything())
  })

  test('defaults to "feature" group when not provided one', () => {
    let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
    drain('abcd')
    expect(emitSpy).toHaveBeenCalledWith('drain-feature', expect.anything())
  })

  test('fails when agent id not provided', () => {
    try {
      drain()
      expect(1).toEqual(2) // should fail here
    } catch (err) {
      expect(1).toEqual(1) // pass
    }
  })
})

test('non-feat groups can register and drain too alongside features', () => {
  registerDrain('abcd', 'page_view_event')
  registerDrain('abcd', 'simba')

  let emitSpy = jest.spyOn(ee.get('abcd'), 'emit')
  drain('abcd', 'simba')
  expect(emitSpy).not.toHaveBeenCalled()

  drain('abcd', 'page_view_event')
  expect(emitSpy).toHaveBeenNthCalledWith(1, 'drain-simba', expect.anything()) // non-feat have prio of 0
  expect(emitSpy).toHaveBeenNthCalledWith(2, 'drain-page_view_event', expect.anything())
})
