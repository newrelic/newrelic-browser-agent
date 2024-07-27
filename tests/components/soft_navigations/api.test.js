import { SoftNav } from '../../../src/features/soft_navigations'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { ee } from '../../../src/common/event-emitter/contextual-ee'

let importAggregatorFn
jest.mock('../../../src/common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global,
  initialLocation: '' + global.location
}))
jest.mock('../../../src/common/window/load', () => ({
  __esModule: true,
  onWindowLoad: jest.fn(cb => { importAggregatorFn = cb })
}))
jest.mock('../../../src/common/config/config', () => ({
  __esModule: true,
  originals: {
    MO: class {
      constructor (callback) { this.cb = callback }
      disconnect () { this.cb = undefined }
      observe (element, initObject) { this.cb() }
    }
  },
  getConfigurationValue: jest.fn(),
  isConfigured: jest.fn().mockReturnValue(true),
  getInfo: jest.fn().mockReturnValue({})
}))
const aggregator = new Aggregator({ agentIdentifier: 'abcd', ee })

describe('soft navigations API', () => {
  const _setTimeout = global.setTimeout
  global.setTimeout = jest.fn((cb, timeout) => _setTimeout(cb, timeout === 0 ? 0 : 300)) // force cancellationTimers to trigger after 0.5 second

  const INTERACTION_API = 'api-ixn-'
  let softNavInstrument, softNavAggregate
  /** Used for testing purposes and is shared btwn/overwritten by .interaction() handles. This equivalent DNE in real prod code. */
  let latestIxnCtx

  beforeAll(async () => {
    softNavInstrument = new SoftNav('ab', aggregator)
    importAggregatorFn()
    await expect(softNavInstrument.onAggregateImported).resolves.toEqual(true)
    softNavAggregate = softNavInstrument.featAggregate
    softNavAggregate.drain()
  })
  beforeEach(() => {
    softNavAggregate.initialPageLoadInteraction = null
    softNavAggregate.interactionInProgress = null
    softNavAggregate.interactionsToHarvest = []
    delete softNavAggregate.latestRouteSetByApi
  })

  const newrelic = {
    interaction: function (newInteractionOpts) {
      const newSandboxHandle = { // will have its own clean 'this' context specific to each newrelic.interaction() call
        command: function (cmd, customTime = performance.now(), ...args) {
          latestIxnCtx = softNavAggregate.ee.emit(INTERACTION_API + cmd, [customTime, ...args], this)
          return this // most spa APIs should return a handle obj that allows for chaining further commands
        }
        // No need for createTracer dummy fn tests?
      }
      return newSandboxHandle.command('get', newInteractionOpts?.customIxnCreationTime, newInteractionOpts)
    },
    setCurrentRouteName: function (routeName) { softNavAggregate.ee.emit(INTERACTION_API + 'routeName', [performance.now(), routeName], this) }
  }

  test('.interaction gets current or creates new api ixn', () => {
    softNavAggregate.initialPageLoadInteraction = { isActiveDuring: () => true }
    newrelic.interaction()
    expect(latestIxnCtx.associatedInteraction).toBe(softNavAggregate.initialPageLoadInteraction) // should grab the iPL if it's still open and no other ixn in progress

    softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
    expect(softNavAggregate.interactionInProgress).toBeTruthy()
    newrelic.interaction() // should grab the UI ixn over the in-progress iPL
    expect(latestIxnCtx.associatedInteraction).toBe(softNavAggregate.interactionInProgress)

    softNavAggregate.interactionInProgress.done()
    expect(softNavAggregate.interactionInProgress).toBeNull()
    newrelic.interaction()
    expect(latestIxnCtx.associatedInteraction).toBe(softNavAggregate.initialPageLoadInteraction) // should fallback to the iPL once the UI ixn is over

    softNavAggregate.initialPageLoadInteraction = null
    newrelic.interaction()
    expect(softNavAggregate.interactionInProgress.trigger).toEqual('api') // once iPL is over, get creates a new api ixn
    expect(softNavAggregate.interactionInProgress.cancellationTimer).toBeUndefined()
  })

  test('.interaction returns a different new handle for every call', async () => {
    const ixn1 = newrelic.interaction()
    const contextId = latestIxnCtx.contextId
    const ixn2 = newrelic.interaction()
    expect(ixn1).not.toBe(ixn2)
    expect(ixn1[contextId].associatedInteraction).toBe(ixn2[contextId].associatedInteraction) // both handles should still be pointing to the same interaction

    softNavAggregate.interactionInProgress.done()
    const ixn3 = newrelic.interaction()
    expect(ixn1[contextId].associatedInteraction).toBeTruthy() // old ixn is retained on handles
    expect(ixn3[contextId].associatedInteraction).not.toBe(ixn2[contextId].associatedInteraction) // new handle should point to new interaction
  })

  test('open api ixn ignores UI events and auto closes after history & dom change', () => {
    newrelic.interaction()
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
    expect(softNavAggregate.interactionInProgress).toBe(latestIxnCtx.associatedInteraction)
    expect(softNavAggregate.interactionInProgress.trigger).toEqual('api')

    softNavAggregate.ee.emit('newURL', [23, 'example.com'])
    softNavAggregate.ee.emit('newDom', [34])
    expect(softNavAggregate.interactionInProgress).toBeNull()
    expect(latestIxnCtx.associatedInteraction.status).toEqual('finished')
  })

  test('.end closes interactions (by default, cancels them)', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
    newrelic.interaction().command('end')
    expect(latestIxnCtx.associatedInteraction.trigger).toEqual('submit')
    expect(latestIxnCtx.associatedInteraction.status).toEqual('cancelled')

    newrelic.interaction().command('end')
    expect(latestIxnCtx.associatedInteraction.trigger).toEqual('api')
    expect(latestIxnCtx.associatedInteraction.status).toEqual('cancelled')
    expect(softNavAggregate.interactionInProgress).toBeNull()
    expect(softNavAggregate.domObserver.cb).toBeUndefined() // observer should be disconnected with .end too
  })

  test('multiple .end on one ixn results in only the first taking effect', () => {
    const newIxn = newrelic.interaction()
    latestIxnCtx.associatedInteraction.forceSave = true
    newIxn.command('end', 100).command('end', 200).command('end', 300)
    expect(latestIxnCtx.associatedInteraction.end).toEqual(100)
  })

  test('.interaction with waitForEnd flag keeps ixn open until .end', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
    let newIxn = newrelic.interaction({ waitForEnd: true }) // on existing UI ixn
    softNavAggregate.ee.emit('newURL', [23, 'example.com'])
    softNavAggregate.ee.emit('newDom', [34])
    expect(softNavAggregate.interactionInProgress.status).toEqual('in progress')
    newIxn.command('end', 45)
    expect(softNavAggregate.interactionInProgress).toBeNull()
    expect(latestIxnCtx.associatedInteraction.end).toEqual(45)

    newIxn = newrelic.interaction({ customIxnCreationTime: 50, waitForEnd: true }) // on new api ixn
    softNavAggregate.ee.emit('newURL', [70, 'example.com'])
    softNavAggregate.ee.emit('newDom', [80])
    expect(softNavAggregate.interactionInProgress.status).toEqual('in progress')
    newIxn.command('end', 90)
    expect(softNavAggregate.interactionInProgress).toBeNull()
    expect(latestIxnCtx.associatedInteraction.end).toEqual(90)
  })

  test('.save forcibly harvest any would-be cancelled ixns', async () => {
    newrelic.interaction().command('save').command('end', 100)
    expect(softNavAggregate.interactionsToHarvest.length).toEqual(1)
    expect(latestIxnCtx.associatedInteraction.end).toEqual(100)

    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 1 }])
    newrelic.interaction().command('save')
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 10 }])
    expect(softNavAggregate.interactionsToHarvest.length).toEqual(2)
    expect(latestIxnCtx.associatedInteraction.end).toBeGreaterThan(latestIxnCtx.associatedInteraction.start) // thisCtx is still referencing the first keydown ixn

    newrelic.interaction().command('save')
    await new Promise(resolve => _setTimeout(resolve, 301))
    /** now that we drain **after** the rumcall flags are emitted, some of the ixns try to get harvested.  just check both buckets */
    expect(softNavAggregate.interactionsToHarvest.length + softNavAggregate.interactionsAwaitingRetry.length).toEqual(3)
  })

  test('.interaction gets ixn retroactively too when processed late after ee buffer drain', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 0 }])
    let timeInBtwn = performance.now()
    newrelic.interaction().command('save').command('end')

    expect(softNavAggregate.interactionsToHarvest.length).toEqual(1)
    newrelic.interaction({ customIxnCreationTime: timeInBtwn })
    expect(latestIxnCtx.associatedInteraction.trigger).toBe('submit')
  })

  test('.ignore forcibly discard any would-be harvested ixns', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
    newrelic.interaction().command('ignore')
    softNavAggregate.ee.emit('newURL', [23, 'example.com'])
    softNavAggregate.ee.emit('newDom', [34])
    expect(softNavAggregate.interactionInProgress).toBeNull()
    expect(softNavAggregate.interactionsToHarvest.length).toEqual(0)

    const newIxn = newrelic.interaction({ waitForEnd: true }).command('ignore').command('save') // ignore ought to override this
    newIxn.command('end')
    expect(softNavAggregate.interactionsToHarvest.length).toEqual(0)
    expect(latestIxnCtx.associatedInteraction.status).toEqual('cancelled')
  })

  test('.getContext stores values scoped to each ixn', async () => {
    let hasRan = false
    newrelic.interaction().command('getContext', undefined, privCtx => { privCtx.someVar = true })
    newrelic.interaction().command('getContext', undefined, privCtx => {
      expect(privCtx.someVar).toEqual(true)
      hasRan = true
    })
    await new Promise(resolve => _setTimeout(resolve, 0)) // getContext runs the cb on an async timer of 0
    expect(hasRan).toEqual(true)
    newrelic.interaction().command('end')

    hasRan = false
    newrelic.interaction().command('getContext', undefined, privCtx => {
      expect(privCtx.someVar).toBeUndefined() // two separate interactions should not share the same data store
      hasRan = true
    })
    await new Promise(resolve => _setTimeout(resolve, 0))
    expect(hasRan).toEqual(true)
  })

  test('.onEnd queues callbacks for right before ixn is done', async () => {
    let hasRan = false
    const newIxn1 = newrelic.interaction().command('getContext', undefined, privCtx => { privCtx.someVar = true })
    await new Promise(resolve => _setTimeout(resolve, 0)) // wait for the someVar to be set
    newIxn1.command('onEnd', undefined, privCtx => {
      expect(privCtx.someVar).toEqual(true) // should have access to the same data store as getContext
      hasRan = true
      newIxn1.command('save') // should be able to force save this would-be discarded ixn
    }).command('end')
    expect(hasRan).toEqual(true)
    expect(softNavAggregate.interactionsToHarvest.length).toEqual(1)

    hasRan = false
    const newIxn2 = newrelic.interaction().command('save')
    newIxn2.command('onEnd', undefined, () => {
      hasRan = true
      newIxn2.command('ignore')
    }).command('end')
    expect(hasRan).toEqual(true)
    expect(softNavAggregate.interactionsToHarvest.length).toEqual(1) // ixn was discarded
  })

  test('.setCurrentRouteName updates the targetRouteName of current ixn and is tracked for new ixn', () => {
    const firstRoute = 'route_X'
    const middleRoute = 'route_Y'
    const lastRoute = 'route_Z'
    let newIxn = newrelic.interaction() // a new ixn would start with undefined old & new routes
    newrelic.setCurrentRouteName(firstRoute)
    expect(latestIxnCtx.associatedInteraction.oldRoute).toBeUndefined()
    expect(latestIxnCtx.associatedInteraction.newRoute).toEqual(firstRoute)
    newIxn.command('end')

    newIxn = newrelic.interaction() // most recent route should be maintained
    expect(latestIxnCtx.associatedInteraction.oldRoute).toEqual(firstRoute)
    expect(latestIxnCtx.associatedInteraction.newRoute).toBeUndefined()
    newrelic.setCurrentRouteName(middleRoute)
    newrelic.setCurrentRouteName(lastRoute)
    expect(latestIxnCtx.associatedInteraction.oldRoute).toEqual(firstRoute)
    expect(latestIxnCtx.associatedInteraction.newRoute).toEqual(lastRoute)
    newIxn.command('end')

    newrelic.setCurrentRouteName(middleRoute) // setCurrentRouteName doesn't need an existing ixn to function, but the change should still carry forward
    newrelic.interaction()
    expect(latestIxnCtx.associatedInteraction.oldRoute).toEqual(middleRoute)
  })

  test('.setName can change customName and trigger of ixn', () => {
    newrelic.interaction().command('setName', undefined, 'quack', 'moo')
    expect(latestIxnCtx.associatedInteraction.customName).toEqual('quack')
    expect(latestIxnCtx.associatedInteraction.trigger).toEqual('moo')
  })

  test('.actionText and .setAttribute add attributes to ixn specifically', () => {
    const newIxn = newrelic.interaction().command('actionText', undefined, 'title')
    newIxn.command('setAttribute', undefined, 'key_1', 'value_1')
    newIxn.command('setAttribute', undefined, 'key_1', 'value_2').command('end')
    expect(latestIxnCtx.associatedInteraction.customAttributes.actionText).toEqual('title')
    expect(latestIxnCtx.associatedInteraction.customAttributes.key_1).toEqual('value_2')

    newrelic.interaction()
    expect(latestIxnCtx.associatedInteraction.customAttributes.actionText).toBeUndefined()
    expect(latestIxnCtx.associatedInteraction.customAttributes.key_1).toBeUndefined()
  })

  // This isn't just an API test; it double serves as data validation on the querypack payload output.
  test('multiple finished ixns retain the correct start/end timestamps in payload', () => {
    let newIxn = newrelic.interaction({ customIxnCreationTime: 100 })
    latestIxnCtx.associatedInteraction.nodeId = 1
    latestIxnCtx.associatedInteraction.id = 'some_id'
    latestIxnCtx.associatedInteraction.forceSave = true
    newIxn.command('end', 200)

    newIxn = newrelic.interaction({ customIxnCreationTime: 300 })
    latestIxnCtx.associatedInteraction.nodeId = 2
    latestIxnCtx.associatedInteraction.id = 'some_other_id'
    latestIxnCtx.associatedInteraction.forceSave = true
    newIxn.command('end', 500)

    newIxn = newrelic.interaction({ customIxnCreationTime: 700 })
    latestIxnCtx.associatedInteraction.nodeId = 3
    latestIxnCtx.associatedInteraction.id = 'some_another_id'
    latestIxnCtx.associatedInteraction.forceSave = true
    newIxn.command('end', 1000)

    expect(softNavAggregate.interactionsToHarvest.length).toEqual(3)
    // WARN: Double check decoded output & behavior or any introduced bugs before changing the follow line's static string.
    expect(softNavAggregate.onHarvestStarted({}).body.e).toEqual("bel.7;1,,2s,2s,,,'api,'http://localhost/,1,1,,2,!!!!'some_id,'1,!!;;1,,5k,5k,,,'api,'http://localhost/,1,1,,2,!!!!'some_other_id,'2,!!;;1,,go,8c,,,'api,'http://localhost/,1,1,,2,!!!!'some_another_id,'3,!!;")
  })
  // This isn't just an API test; it double serves as data validation on the querypack payload output.
  test('multiple finished ixns with ajax have correct start/end timestamps (in ajax nodes)', () => {
    let newIxn = newrelic.interaction({ customIxnCreationTime: 1.23 })
    latestIxnCtx.associatedInteraction.nodeId = 1
    latestIxnCtx.associatedInteraction.id = 'some_id'
    latestIxnCtx.associatedInteraction.forceSave = true
    newIxn.command('end', 4.56)
    softNavAggregate.ee.emit('ajax', [{ startTime: 2.34, endTime: 5.67 }])
    latestIxnCtx.associatedInteraction.children[0].nodeId = 2
    softNavAggregate.ee.emit('ajax', [{ startTime: 3.45, endTime: 6.78 }])
    latestIxnCtx.associatedInteraction.children[1].nodeId = 3

    newIxn = newrelic.interaction({ customIxnCreationTime: 10 })
    latestIxnCtx.associatedInteraction.nodeId = 4
    latestIxnCtx.associatedInteraction.id = 'some_other_id'
    latestIxnCtx.associatedInteraction.forceSave = true
    newIxn.command('end', 14)
    softNavAggregate.ee.emit('ajax', [{ startTime: 11, endTime: 12 }])
    latestIxnCtx.associatedInteraction.children[0].nodeId = 5
    softNavAggregate.ee.emit('ajax', [{ startTime: 12, endTime: 13 }])
    latestIxnCtx.associatedInteraction.children[1].nodeId = 6
    expect(softNavAggregate.interactionsToHarvest.length).toEqual(2)
    // WARN: Double check decoded output & behavior or any introduced bugs before changing the follow line's static string.
    expect(softNavAggregate.onHarvestStarted({}).body.e).toEqual("bel.7;1,2,1,3,,,'api,'http://localhost/,1,1,,2,!!!!'some_id,'1,!!;2,,1,3,,,,,,,,,,'2,!!!;2,,2,3,,,,,,,,,,'3,!!!;;1,2,9,4,,,'api,'http://localhost/,1,1,,2,!!!!'some_other_id,'4,!!;2,,a,1,,,,,,,,,,'5,!!!;2,,b,1,,,,,,,,,,'6,!!!;")
  })
})
