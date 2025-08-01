import { Instrument as SoftNav } from '../../../src/features/soft_navigations/instrument'
import { resetAgent, setupAgent } from '../setup-agent'

/**
 * Test `.interaction gets ixn retroactively too when processed late after ee buffer drain` is a bit
 * flaky so add a retry for this file.
 */

const INTERACTION_API = 'api-ixn'
let mainAgent

beforeAll(() => {
  mainAgent = setupAgent({
    agentOverrides: {
      runSoftNavOverSpa: true
    },
    init: {
      feature_flags: ['soft_nav'],
      soft_navigations: { enabled: true }
    }
  })
})

let softNavAggregate

beforeEach(async () => {
  // to prevent xmlhttprequest errors in jest
  const xhrMockClass = () => ({
    open: jest.fn(),
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    addEventListener: jest.fn()
  })

  global.XMLHttpRequest = jest.fn().mockImplementation(xhrMockClass)

  const softNavInstrument = new SoftNav(mainAgent)
  await new Promise(process.nextTick)
  softNavAggregate = softNavInstrument.featAggregate

  softNavAggregate.ee.emit('rumresp', [{ spa: 1 }])
  await new Promise(process.nextTick)

  softNavAggregate.initialPageLoadInteraction = null
  softNavAggregate.interactionInProgress = null
  delete softNavAggregate.latestRouteSetByApi
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

test('.interaction gets current or creates new api ixn', () => {
  softNavAggregate.initialPageLoadInteraction = { isActiveDuring: () => true }
  const ixn1 = mainAgent.interaction()
  expect(getIxnContext(ixn1).associatedInteraction).toBe(softNavAggregate.initialPageLoadInteraction) // should grab the iPL if it's still open and no other ixn in progress

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  expect(getIxnContext(mainAgent.interaction()).associatedInteraction).toBe(softNavAggregate.interactionInProgress)

  softNavAggregate.interactionInProgress.done()
  expect(softNavAggregate.interactionInProgress).toBeNull()
  const ixn2 = mainAgent.interaction()
  expect(getIxnContext(ixn2).associatedInteraction).toBe(softNavAggregate.initialPageLoadInteraction) // should fallback to the iPL once the UI ixn is over

  softNavAggregate.initialPageLoadInteraction = null
  mainAgent.interaction()
  expect(softNavAggregate.interactionInProgress.trigger).toEqual('api') // once iPL is over, get creates a new api ixn
  expect(softNavAggregate.interactionInProgress.cancellationTimer).toBeUndefined()
})

test('.interaction returns a different new context for every call', async () => {
  const ixn1 = mainAgent.interaction()
  const ixn2 = mainAgent.interaction()
  expect(ixn1).not.toBe(ixn2)
  expect(getIxnContext(ixn1).associatedInteraction).toBe(getIxnContext(ixn2).associatedInteraction) // both handles should still be pointing to the same interaction

  softNavAggregate.interactionInProgress.done()
  const ixn3 = mainAgent.interaction()
  expect(getIxnContext(ixn1).associatedInteraction).toBeTruthy() // old ixn is retained on handles
  expect(getIxnContext(ixn3).associatedInteraction).not.toEqual(getIxnContext(ixn1).associatedInteraction) // new handle should point to new interaction
})

test('open api ixn ignores UI events and auto closes after history & dom change', () => {
  const ixn = mainAgent.interaction()
  const ixnContext = getIxnContext(ixn)
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
  expect(softNavAggregate.interactionInProgress).toBe(ixnContext.associatedInteraction)
  expect(softNavAggregate.interactionInProgress.trigger).toEqual('api')

  softNavAggregate.ee.emit('newURL', [23, 'example.com'])
  softNavAggregate.ee.emit('newDom', [34])
  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(ixnContext.associatedInteraction.status).toEqual('finished')
})

test('.end closes interactions (by default, cancels them)', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
  let ixn = mainAgent.interaction()
  let ixnContext = getIxnContext(ixn)
  ixn.end()
  expect(ixnContext.associatedInteraction.trigger).toEqual('submit')
  expect(ixnContext.associatedInteraction.status).toEqual('cancelled')

  ixn = mainAgent.interaction()
  ixnContext = getIxnContext(ixn)
  ixn.end()
  expect(ixnContext.associatedInteraction.trigger).toEqual('api')
  expect(ixnContext.associatedInteraction.status).toEqual('cancelled')
  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(softNavAggregate.domObserver.cb).toBeUndefined() // observer should be disconnected with .end too
})

test('multiple .end on one ixn results in only the first taking effect', () => {
  const ixn = mainAgent.interaction()
  const ixnContext = getIxnContext(ixn)

  ixnContext.associatedInteraction.forceSave = true
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [100], ixnContext)
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [200], ixnContext)
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [300], ixnContext)

  expect(ixnContext.associatedInteraction.status).toEqual('finished')
  expect(ixnContext.associatedInteraction.end).toEqual(100)
})

test('.interaction with waitForEnd flag keeps ixn open until .end', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])

  let ixn = mainAgent.interaction({ waitForEnd: true })
  let ixnContext = getIxnContext(ixn)
  softNavAggregate.ee.emit('newURL', [23, 'example.com'])
  softNavAggregate.ee.emit('newDom', [34])

  expect(softNavAggregate.interactionInProgress.status).toEqual('in progress')
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [45], ixnContext)
  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(ixnContext.associatedInteraction.end).toEqual(45)

  ixn = mainAgent.interaction({ waitForEnd: true }) // on new api ixn
  ixnContext = getIxnContext(ixn)
  softNavAggregate.ee.emit('newURL', [70, 'example.com'])
  softNavAggregate.ee.emit('newDom', [80])

  expect(softNavAggregate.interactionInProgress.status).toEqual('in progress')
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [90], ixnContext)
  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(ixnContext.associatedInteraction.end).toEqual(90)
})

test('.save forcibly harvest any would-be cancelled ixns', async () => {
  let ixn = mainAgent.interaction().save()
  let ixnContext = getIxnContext(ixn)
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [100], ixnContext)
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1)
  expect(ixnContext.associatedInteraction.end).toEqual(100)

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 200 }])
  ixn = mainAgent.interaction().save()
  ixnContext = getIxnContext(ixn)
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 210 }])
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(2)
  expect(ixnContext.associatedInteraction.end).toBeGreaterThan(ixnContext.associatedInteraction.start) // thisCtx is still referencing the first keydown ixn

  mainAgent.interaction().save().end()
  await new Promise(process.nextTick)
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(3)
})

test('.ignore forcibly discard any would-be harvested ixns', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
  mainAgent.interaction().ignore()
  softNavAggregate.ee.emit('newURL', [23, 'example.com'])
  softNavAggregate.ee.emit('newDom', [34])
  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0)

  const ixn = mainAgent.interaction({ waitForEnd: true }).ignore().save() // ignore ought to override this
  ixn.end()
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0)
  expect(getIxnContext(ixn).associatedInteraction.status).toEqual('cancelled')
})

test('.getContext stores values scoped to each ixn', async () => {
  let hasRan = false
  mainAgent.interaction().getContext(privCtx => { privCtx.someVar = true })
  mainAgent.interaction().getContext(privCtx => {
    expect(privCtx.someVar).toEqual(true)
    hasRan = true
  })

  await new Promise(resolve => setTimeout(resolve, 100))
  expect(hasRan).toEqual(true)
  mainAgent.interaction().end()

  hasRan = false
  mainAgent.interaction().getContext(privCtx => {
    expect(privCtx.someVar).toBeUndefined() // two separate interactions should not share the same data store
    hasRan = true
  })
  await new Promise(resolve => setTimeout(resolve, 100))
  expect(hasRan).toEqual(true)
})

test('.onEnd queues callbacks for right before ixn is done', async () => {
  let hasRan = false
  const ixn1 = mainAgent.interaction().getContext(privCtx => { privCtx.someVar = true })
  await new Promise(resolve => setTimeout(resolve, 100))
  ixn1.onEnd(privCtx => {
    expect(privCtx.someVar).toEqual(true) // should have access to the same data store as getContext
    hasRan = true
    ixn1.save() // should be able to force save this would-be discarded ixn
  }).end()
  expect(hasRan).toEqual(true)
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1)

  hasRan = false
  const ixn2 = mainAgent.interaction().save()
  ixn2.onEnd(() => {
    hasRan = true
    ixn2.ignore()
  }).end()
  expect(hasRan).toEqual(true)
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1) // ixn was discarded
})

test('.setCurrentRouteName updates the targetRouteName of current ixn and is tracked for new ixn', () => {
  const firstRoute = 'route_X'
  const middleRoute = 'route_Y'
  const lastRoute = 'route_Z'
  let ixn = mainAgent.interaction() // a new ixn would start with undefined old & new routes
  let ixnContext = getIxnContext(ixn)
  mainAgent.setCurrentRouteName(firstRoute)
  expect(ixnContext.associatedInteraction.oldRoute).toBeUndefined()
  expect(ixnContext.associatedInteraction.newRoute).toEqual(firstRoute)
  ixn.end()

  ixn = mainAgent.interaction() // most recent route should be maintained
  ixnContext = getIxnContext(ixn)
  expect(ixnContext.associatedInteraction.oldRoute).toEqual(firstRoute)
  expect(ixnContext.associatedInteraction.newRoute).toBeUndefined()
  mainAgent.setCurrentRouteName(middleRoute)
  mainAgent.setCurrentRouteName(lastRoute)
  expect(ixnContext.associatedInteraction.oldRoute).toEqual(firstRoute)
  expect(ixnContext.associatedInteraction.newRoute).toEqual(lastRoute)
  ixn.end()

  mainAgent.setCurrentRouteName(middleRoute) // setCurrentRouteName doesn't need an existing ixn to function, but the change should still carry forward
  ixn = mainAgent.interaction()
  ixnContext = getIxnContext(ixn)
  expect(ixnContext.associatedInteraction.oldRoute).toEqual(middleRoute)
})

test('.setName can change customName and trigger of ixn', () => {
  const ixn = mainAgent.interaction().setName('quack', 'moo')
  const ixnContext = getIxnContext(ixn)
  expect(ixnContext.associatedInteraction.customName).toEqual('quack')
  expect(ixnContext.associatedInteraction.trigger).toEqual('moo')
})

test('.actionText and .setAttribute add attributes to ixn specifically', () => {
  let ixn = mainAgent.interaction().actionText('title')
  let ixnContext = getIxnContext(ixn)
  ixn.setAttribute('key_1', 'value_1')
  ixn.setAttribute('key_1', 'value_2').end()
  expect(ixnContext.associatedInteraction.customAttributes.actionText).toEqual('title')
  expect(ixnContext.associatedInteraction.customAttributes.key_1).toEqual('value_2')

  ixn = mainAgent.interaction()
  ixnContext = getIxnContext(ixn)
  expect(ixnContext.associatedInteraction.customAttributes.actionText).toBeUndefined()
  expect(ixnContext.associatedInteraction.customAttributes.key_1).toBeUndefined()
})

// This isn't just an API test; it double serves as data validation on the querypack payload output.
test('multiple finished ixns retain the correct start/end timestamps in payload', () => {
  softNavAggregate.ee.emit(`${INTERACTION_API}-get`, [0])
  let ixnContext = getIxnContext(mainAgent.interaction())
  ixnContext.associatedInteraction.nodeId = 1
  ixnContext.associatedInteraction.id = 'some_id'
  ixnContext.associatedInteraction.forceSave = true
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [200], ixnContext)

  softNavAggregate.ee.emit(`${INTERACTION_API}-get`, [300])
  ixnContext = getIxnContext(mainAgent.interaction())
  ixnContext.associatedInteraction.nodeId = 2
  ixnContext.associatedInteraction.id = 'some_other_id'
  ixnContext.associatedInteraction.forceSave = true
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [500], ixnContext)

  softNavAggregate.ee.emit(`${INTERACTION_API}-get`, [700])
  ixnContext = getIxnContext(mainAgent.interaction())
  ixnContext.associatedInteraction.nodeId = 3
  ixnContext.associatedInteraction.id = 'some_another_id'
  ixnContext.associatedInteraction.forceSave = true
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [1000], ixnContext)

  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(3)
  // WARN: Double check decoded output & behavior or any introduced bugs before changing the follow line's static string.
  expect(softNavAggregate.makeHarvestPayload()[0].payload.body).toEqual("bel.7;1,,,5k,,,'api,'http://localhost/,1,1,,2,!!!!'some_id,'1,!!;;1,,8c,5k,,,'api,'http://localhost/,1,1,,2,!!!!'some_other_id,'2,!!;;1,,jg,8c,,,'api,'http://localhost/,1,1,,2,!!!!'some_another_id,'3,!!;")
})

// This isn't just an API test; it double serves as data validation on the querypack payload output.
test('multiple finished ixns with ajax have correct start/end timestamps (in ajax nodes)', () => {
  softNavAggregate.ee.emit(`${INTERACTION_API}-get`, [1.23])
  let ixnContext = getIxnContext(mainAgent.interaction())
  ixnContext.associatedInteraction.nodeId = 1
  ixnContext.associatedInteraction.id = 'some_id'
  ixnContext.associatedInteraction.forceSave = true
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [4.56], ixnContext)

  softNavAggregate.ee.emit('ajax', [{ startTime: 2.34, endTime: 5.67 }])
  ixnContext.associatedInteraction.children[0].nodeId = 2
  softNavAggregate.ee.emit('ajax', [{ startTime: 3.45, endTime: 6.78 }])
  ixnContext.associatedInteraction.children[1].nodeId = 3

  softNavAggregate.ee.emit(`${INTERACTION_API}-get`, [10])
  ixnContext = getIxnContext(mainAgent.interaction())
  ixnContext.associatedInteraction.nodeId = 4
  ixnContext.associatedInteraction.id = 'some_other_id'
  ixnContext.associatedInteraction.forceSave = true
  softNavAggregate.ee.emit(`${INTERACTION_API}-end`, [14], ixnContext)

  softNavAggregate.ee.emit('ajax', [{ startTime: 11, endTime: 12 }])
  ixnContext.associatedInteraction.children[0].nodeId = 5
  softNavAggregate.ee.emit('ajax', [{ startTime: 12, endTime: 13 }])
  ixnContext.associatedInteraction.children[1].nodeId = 6

  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(2)
  // WARN: Double check decoded output & behavior or any introduced bugs before changing the follow line's static string.
  expect(softNavAggregate.makeHarvestPayload()[0].payload.body).toEqual("bel.7;1,2,1,3,,,'api,'http://localhost/,1,1,,2,!!!!'some_id,'1,!!;2,,1,3,,,,,,,,,,'2,!!!;2,,2,3,,,,,,,,,,'3,!!!;;1,2,9,4,,,'api,'http://localhost/,1,1,,2,!!!!'some_other_id,'4,!!;2,,a,1,,,,,,,,,,'5,!!!;2,,b,1,,,,,,,,,,'6,!!!;")
})

function getIxnContext (ixn) {
  const contextId = Object.getOwnPropertyNames(ixn)
    .find((key) => key.startsWith('nr@context:'))
  return ixn[contextId]
}
