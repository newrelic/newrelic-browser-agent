import { EventContext } from '../../../src/common/event-emitter/event-context'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { Instrument as SoftNav } from '../../../src/features/soft_navigations/instrument'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { resetAgent, setupAgent } from '../setup-agent'

let mainAgent
const params = {
  method: 'PUT',
  status: 200,
  host: 'https://example.com',
  hostname: 'example.com',
  pathname: '/pathname'
}
const metrics = {
  txSize: 128,
  rxSize: 256,
  cbTime: 5
}

beforeAll(() => {
  mainAgent = setupAgent({
    init: {
      ajax: { enabled: true },
      soft_navigations: { enabled: true }
    }
  })
})
let ajaxAggregate, softNavAggregate, context
beforeEach(async () => {
  const ajaxInstrument = new Ajax(mainAgent)
  const softNavInstrument = new SoftNav(mainAgent)
  await Promise.all([ajaxInstrument.onAggregateImported, softNavInstrument.onAggregateImported])
  ajaxAggregate = ajaxInstrument.featAggregate
  softNavAggregate = softNavInstrument.featAggregate

  // Register soft nav feature so ajax aggregate can detect it
  mainAgent.features[FEATURE_NAMES.softNav] = softNavInstrument

  context = new EventContext()
  ajaxAggregate.ee.emit('rumresp', [{ spa: 1 }]) // both features share the same ee event so this activate & drain both; ajax needs no flag
  await new Promise(process.nextTick)

  softNavAggregate.initialPageLoadInteraction.done(1) // so that IPL doesn't muddy the ixn seeking logic
  softNavAggregate.events.clear()
})
afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
})

test('on interaction finish, ajax within time span are associated, others standalone', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  softNavAggregate.ee.emit('newURL', [150, 'new_location'])
  ajaxAggregate.storeXhr(params, metrics, 175, 225, 'XMLHttpRequest', context) // ensure xhr happening during default heuristics are associated
  softNavAggregate.ee.emit('newDom', [200])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()

  ajaxAggregate.storeXhr(params, metrics, 250, 350, 'fetch', context) // ensure xhr happening during wait window for actualized long tasks are associated
  ajaxAggregate.storeXhr(params, metrics, 325, 400, 'XMLHttpRequest', context) // this one should fall outside the final interaction span and be standalone
  expect(ajaxAggregate.events.get().length).toEqual(0)

  softNavAggregate.interactionInProgress.customEnd = 300 // simulate a long task extending the interaction end time (pretend there's some delay (waiting window) before ixn gets finalized)
  softNavAggregate.interactionInProgress.done()
  expect(ajaxAggregate.events.get().length).toEqual(1)
  expect(ajaxAggregate.events.get()[0]).toEqual(expect.objectContaining({ startTime: 325, endTime: 400 })) // the 3rd one that falls outside ixn span

  expect(softNavAggregate.events.get().length).toEqual(1)
  const ixn = softNavAggregate.events.get()[0]
  expect(ixn.end).toEqual(300)
  expect(ixn.children.length).toEqual(2)
  expect(ixn.children[0]).toEqual(expect.objectContaining({ start: 175, end: 225 }))
  expect(ixn.children[1]).toEqual(expect.objectContaining({ start: 250, end: 350 }))
})

test('on spa API .end(), ajax prior to call is associated and post-call is standalone', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  softNavAggregate.ee.emit('newURL', [150, 'new_location'])
  softNavAggregate.ee.emit('newDom', [200])

  ajaxAggregate.storeXhr(params, metrics, 250, 299, 'fetch', context)
  softNavAggregate.interactionInProgress.done(300, true) // simulate API call to .end() at 300, this would occur in order
  ajaxAggregate.storeXhr(params, metrics, 301, 350, 'fetch', context)

  expect(ajaxAggregate.events.get().length).toEqual(1)
  const ixn = softNavAggregate.events.get()[0]
  expect(ixn.end).toEqual(300)
  expect(ixn.children.length).toEqual(1)
})
