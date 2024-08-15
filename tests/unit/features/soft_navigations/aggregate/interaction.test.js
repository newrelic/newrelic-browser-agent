import { Interaction } from '../../../../../src/features/soft_navigations/aggregate/interaction'
import { INTERACTION_STATUS } from '../../../../../src/features/soft_navigations/constants'
import * as configModule from '../../../../../src/common/config/config'
import { Obfuscator } from '../../../../../src/common/util/obfuscate'

jest.mock('../../../../../src/common/config/config', () => ({
  __esModule: true,
  getInfo: jest.fn().mockReturnValue({
    jsAttributes: {
      key1: 'value1',
      key2: 'value2'
    },
    atts: 'apm_attributes_string'
  }),
  getConfigurationValue: jest.fn(),
  getRuntime: jest.fn()
}))

beforeEach(() => {
  jest.mocked(configModule.getRuntime).mockReturnValue({
    obfuscator: new Obfuscator('abcd')
  })
})

test('Interaction node creation is correct', () => {
  const ixn = new Interaction('abcd', 'click', 1234)

  expect(ixn.belType).toEqual(1)
  expect(ixn.nodeId).toEqual(1)
  expect(ixn.callbackDuration === 0 && ixn.callbackEnd === 0).toBeTruthy()
  expect(ixn.id).toEqual(expect.any(String))
  expect(ixn.initialPageURL === location.href && ixn.oldURL === ixn.initialPageURL && ixn.newURL === ixn.oldURL).toBeTruthy()
  expect(ixn.status).toBe(INTERACTION_STATUS.IP)
  expect(ixn.domTimestamp || ixn.historyTimestamp).toBe(0)
  expect(ixn.createdByApi || ixn.keepOpenUntilEndApi).toBe(false)
  expect(ixn.cancellationTimer).toBeUndefined()
  expect(ixn.trigger).toBe('click')
  expect(ixn.start).toBe(1234)
  expect(ixn.end).toBeUndefined()
  expect(ixn.oldRoute || ixn.newRoute).toBeUndefined()
  expect(ixn.forceSave || ixn.forceIgnore).toBe(false)

  const ixn2 = new Interaction('abcd', 'api', 1234, 'some_route')
  expect(ixn2.trigger).toBe('api')
  expect(ixn2.createdByApi).toBe(true)
  expect(ixn2.oldRoute).toBe('some_route')
  expect(ixn2.newRoute).toBeUndefined()
})

test('History and DOM timestamps fn updates', () => {
  const ixn = new Interaction('abcd')
  ixn.updateDom(5812)
  expect(ixn.domTimestamp).toBe(5812)
  expect(ixn.seenHistoryAndDomChange()).toBeFalsy()
  ixn.updateHistory(6134)
  expect(ixn.newURL).toBe(location.href)
  expect(ixn.seenHistoryAndDomChange()).toBeFalsy()
  ixn.updateHistory(4951, 'some_new_url')
  expect(ixn.newURL).toBe('some_new_url')
  expect(ixn.seenHistoryAndDomChange()).toBeTruthy()
})

test('Can subscribe to interaction events', () => {
  const ixn = new Interaction('abcd')
  expect(() => ixn.on('invalid_event', function () {})).toThrow()
  expect(() => ixn.on('finished', 'not_a_fn_type')).toThrow()

  function futureCb () {}
  ixn.on('finished', futureCb)
  expect(ixn.eventSubscription.get('finished')).toStrictEqual([futureCb])
  ixn.on('cancelled', futureCb)
  expect(ixn.eventSubscription.get('cancelled')).toStrictEqual([futureCb])
})

test('isActiveDuring correctly compares given timestamp', () => {
  const ixn = new Interaction('abcd', undefined, 50)
  expect(ixn.isActiveDuring(25)).toBe(false)
  expect(ixn.isActiveDuring(100)).toBe(true) // since it's still in progress
  ixn.status = INTERACTION_STATUS.FIN
  ixn.end = 99
  expect(ixn.isActiveDuring(25)).toBe(false)
  expect(ixn.isActiveDuring(75)).toBe(true)
  expect(ixn.isActiveDuring(100)).toBe(false)
})

describe('Interaction when done', () => {
  test('runs stuff and returns the correct boolean value', () => {
    const ixn = new Interaction('abcd')
    ixn.status = INTERACTION_STATUS.FIN // can disregard #finish and #cancel for now

    ixn.keepOpenUntilEndApi = true // with this flag, ixn should stay open until a custom end time is provided
    expect(ixn.done()).toBe(false)
    expect(ixn.done(123)).toBe(true)
    ixn.keepOpenUntilEndApi = false

    let wasRan = false
    ixn.onDone.push(sandboxObj => { sandboxObj.should_share = true },
      sandboxObj => { expect(sandboxObj.should_share).toBe(true); wasRan = true }) // callbacks in the onDone array should share the same arg object
    expect(ixn.done()).toBe(true)
    expect(wasRan).toBe(true)
  })
  test('is cancelled under certain conditions', () => {
    const ixn = new Interaction('abc')
    let wasRan = false
    ixn.on('cancelled', () => { wasRan = true })

    ixn.forceIgnore = ixn.forceSave = false
    ixn.done() // default case when no history & dom change
    expect(ixn.status).toBe(INTERACTION_STATUS.CAN)
    expect(wasRan).toBe(true)

    ixn.status = INTERACTION_STATUS.IP
    ixn.forceIgnore = true
    ixn.done()
    expect(ixn.status).toBe(INTERACTION_STATUS.CAN)

    ixn.status = INTERACTION_STATUS.IP
    ixn.forceSave = true
    ixn.done()
    expect(ixn.status).toBe(INTERACTION_STATUS.CAN) // ignore should override save
  })
  test('is saved properly under certain conditions', () => {
    const ixn = new Interaction('abc', undefined, 0)
    let wasRan = false
    ixn.on('finished', () => { wasRan = true })

    ixn.forceIgnore = false; ixn.forceSave = true
    ixn.customAttributes.key1 = 'higher_precedence_value'
    const timeNow = Math.floor(performance.now())
    ixn.done()
    expect(ixn.status).toBe(INTERACTION_STATUS.FIN) // save even without history or dom timestamp
    expect(wasRan).toBe(true)
    expect(ixn.end).toBeGreaterThanOrEqual(timeNow) // whenever the ixn is closed -- example case: when ixn is cancelled but has forceSave flag
    expect(ixn.customAttributes.key1).toBe('higher_precedence_value')
    expect(ixn.customAttributes.key2).toBe('value2')

    ixn.updateHistory(250)
    ixn.status = INTERACTION_STATUS.IP
    ixn.done(500) // when ixn end time is specified -- example case: calling the .end api ; end time should consider this value
    expect(ixn.status).toBe(INTERACTION_STATUS.FIN)
    expect(ixn.end).toBe(500)

    ixn.updateDom(750) // now the conditions for seenHistoryAndDomChange() is met
    ixn.status = INTERACTION_STATUS.IP
    ixn.done()
    expect(ixn.end).toBe(750)

    ixn.forceSave = false; ixn.end = 0
    ixn.status = INTERACTION_STATUS.IP
    ixn.done() // double checking the behavior is still the same without save flag (default conditions)
    expect(ixn.end).toBe(750)

    ixn.status = INTERACTION_STATUS.IP
    ixn.done(1000) // double checking the custom end is still respected even with seenHistoryAndDom -- example case: ixn is kept open past it and only closed by .end
    expect(ixn.end).toBe(1000)
  })
})

test('Interaction serialize output is correct', () => {
  jest.resetModules() // reset so we get a reliable node ID of 1
  jest.doMock('../../../../../src/common/config/config', () => ({
    __esModule: true,
    getInfo: jest.fn().mockReturnValue({
      jsAttributes: {
        key1: 'value1',
        key2: 'value2'
      },
      atts: 'apm_attributes_string'
    }),
    getConfigurationValue: jest.fn(),
    getRuntime: jest.fn().mockReturnValue({
      obfuscator: new Obfuscator('abcd')
    })
  }))
  const { Interaction } = require('../../../../../src/features/soft_navigations/aggregate/interaction')
  const ixn = new Interaction('abcd', 'submit', 1234, 'this_route')
  ixn.id = 'static-id'
  ixn.forceSave = true
  ixn.customName = 'my_custom_name'
  ixn.done(5678)

  expect(ixn.nodeId).toEqual(1)
  expect(ixn.serialize(0)).toBe("1,3,ya,3fg,,,'submit,'http://localhost/,1,1,'my_custom_name,2,!!'this_route,!'static-id,'1,!!;5,'key1,'value1;5,'key2,'value2;a,'apm_attributes_string;")

  ixn.newURL = 'some_new_url'
  ixn.newRoute = 'some_new_route'
  ixn.addChild({ serialize: () => 'serialized_child_string' })
  expect(ixn.serialize(0)).toBe("1,4,ya,3fg,,,'submit,'http://localhost/,1,'some_new_url,'my_custom_name,1,!!'this_route,'some_new_route,'static-id,'1,!!;5,'key1,'value1;5,'key2,'value2;a,'apm_attributes_string;serialized_child_string;")
})
