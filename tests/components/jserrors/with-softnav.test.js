import { Instrument as JsErrors } from '../../../src/features/jserrors/instrument'
import { Instrument as SoftNav } from '../../../src/features/soft_navigations/instrument'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { resetAgent, setupAgent } from '../setup-agent'

let mainAgent
beforeAll(() => {
  mainAgent = setupAgent({
    init: {
      jserrors: { enabled: true },
      soft_navigations: { enabled: true }
    }
  })
})
let jserrorsAggregate, softNavAggregate
beforeEach(async () => {
  const jserrorsInstrument = new JsErrors(mainAgent)
  const softNavInstrument = new SoftNav(mainAgent)
  await Promise.all([jserrorsInstrument.onAggregateImported, softNavInstrument.onAggregateImported])
  jserrorsAggregate = jserrorsInstrument.featAggregate
  softNavAggregate = softNavInstrument.featAggregate

  // Register soft nav feature so jserrors aggregate can detect it
  mainAgent.features[FEATURE_NAMES.softNav] = softNavInstrument

  jserrorsAggregate.ee.emit('rumresp', [{ err: 1, spa: 1 }]) // both features share the same ee event so this activate & drain both
  await new Promise(process.nextTick)
  softNavAggregate.initialPageLoadInteraction.done(1) // so that IPL doesn't muddy the ixn seeking logic
})
afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
})

test('on interaction cancel, buffered jserrors are flushed as standalone', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  // const ixnId = softNavAggregate.interactionInProgress.id

  jserrorsAggregate.storeError(new Error('test error'), 200)
  // Error should not be in jserrors events yet, waiting for soft nav to return it
  expect(jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)).toBeNull()

  softNavAggregate.interactionInProgress.done()
  expect(softNavAggregate.interactionInProgress).toBeNull()
  // After cancellation, error should be returned as standalone
  const harvestedData = jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)
  expect(harvestedData).toBeTruthy()
  expect(harvestedData.err.length).toEqual(1)
  const errsHarvested = harvestedData.err.map(jseEvent => jseEvent.params)
  expect(errsHarvested[0].browserInteractionId).toBeUndefined()
})

test('on interaction finish, jserrors within time span are associated, others standalone', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  softNavAggregate.ee.emit('newURL', [150, 'new_location'])
  jserrorsAggregate.storeError(new Error('test1'), 175) // ensure errors happening during default heuristics are associated
  softNavAggregate.ee.emit('newDom', [200])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  const ixnId = softNavAggregate.interactionInProgress.id

  jserrorsAggregate.storeError(new Error('test2'), 250) // ensure errors happening during wait window for actualized long tasks are associated
  softNavAggregate.interactionInProgress.customEnd = 300 // simulate a long task extending the interaction end time
  jserrorsAggregate.storeError(new Error('test3'), 350) // this one should fall outside the final interaction span and be standalone
  // Errors should not be in jserrors events yet, waiting for soft nav to return them
  expect(jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)).toBeNull()

  softNavAggregate.interactionInProgress.done()
  // After interaction finishes, all errors should be returned and stored
  const harvestedData = jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)
  expect(harvestedData).toBeTruthy()
  const errsHarvested = harvestedData.err.map(jseEvent => jseEvent.params)
  expect(errsHarvested.length).toEqual(3)
  expect(errsHarvested[0]).toEqual(expect.objectContaining({ message: 'test1', browserInteractionId: ixnId }))
  expect(errsHarvested[1]).toEqual(expect.objectContaining({ message: 'test2', browserInteractionId: ixnId }))
  expect(errsHarvested[2].message).toEqual('test3')
  expect(errsHarvested[2].browserInteractionId).toBeUndefined()
})
