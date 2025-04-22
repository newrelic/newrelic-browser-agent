import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as SoftNav } from '../../../src/features/soft_navigations/instrument'
import * as ttfbModule from '../../../src/common/vitals/time-to-first-byte'
import { INTERACTION_STATUS } from '../../../src/features/soft_navigations/constants'

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
  jest.spyOn(ttfbModule.timeToFirstByte, 'subscribe')

  const softNavInstrument = new SoftNav(mainAgent)
  await softNavInstrument.onAggregateImported
  softNavAggregate = softNavInstrument.featAggregate

  softNavAggregate.ee.emit('rumresp', [{ spa: 1 }])
  await new Promise(process.nextTick)
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

test('processes regular interactions', () => {
  expect(softNavAggregate.domObserver).toBeTruthy()
  expect(softNavAggregate.initialPageLoadInteraction).toBeTruthy()

  const ttfbSubscriber = jest.mocked(ttfbModule.timeToFirstByte.subscribe).mock.calls[0][0]
  ttfbSubscriber({ attrs: { navigationEntry: { loadEventEnd: 123 } } })
  expect(softNavAggregate.initialPageLoadInteraction).toBeNull()
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1)

  softNavAggregate.ee.emit('newURL', [234, '' + window.location])
  softNavAggregate.ee.emit('newDom', [235])
  expect(softNavAggregate.interactionInProgress).toBeNull() // neither history or dom should initiate an interaction
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 345 }])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  softNavAggregate.ee.emit('newDom', [346])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  softNavAggregate.ee.emit('newURL', [347, '' + window.location])
  expect(softNavAggregate.interactionInProgress).toBeTruthy() // history doesn't call 'done' on the ixn (chronological order enforcement)
  softNavAggregate.ee.emit('newDom', [345])
  expect(softNavAggregate.interactionInProgress).toBeTruthy() // dom has to be aka fired after history
  softNavAggregate.ee.emit('newDom', [348.5])
  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(softNavAggregate.domObserver.cb).toBeUndefined() // observer should be disconnected after ixn done
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(2)
  expect(softNavAggregate.interactionsToHarvest.get()[0].data[1].end).toEqual(348.5) // check end time for the ixn is as expected
})

test('regular interactions have applicable timeouts', async () => {
  jest.useFakeTimers()

  expect(softNavAggregate.initialPageLoadInteraction.cancellationTimer).toBeUndefined()

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  jest.runAllTimers()

  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0) // since initialPageLoad ixn hasn't closed, and we expect that UI ixn to have been cancelled

  jest.useRealTimers()
})

test('interactions are replaced by new UI events', async () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'click', timeStamp: 100, target: { tagName: 'a' } }])
  const currentIxn = softNavAggregate.interactionInProgress
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 110 }]) // keep in mind: debounce logic is in the instrument part
  expect(softNavAggregate.interactionInProgress).not.toBe(currentIxn)
  expect(softNavAggregate.interactionInProgress.trigger).toEqual('keydown')
})

test('double precision Event DOMHighResTimestamp (microsec) is floored to ms and isActiveDuring with now() works', () => {
  const preciseCurrentTime = performance.now()
  const currentTime = Date.now() // this value is expected to be a truncated version of preciseCurrentTime, e.g. 421 ms vs 421.291 ms

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: preciseCurrentTime }])
  expect(softNavAggregate.interactionInProgress.isActiveDuring(currentTime)).toBeTruthy()
  expect(Number.isInteger(softNavAggregate.interactionInProgress.start)).toBeTruthy()
})

test('getInteractionFor grabs the right active interaction for a timestamp', () => {
  // initial page load ixn is ongoing at this point
  expect(softNavAggregate.getInteractionFor(performance.now())).toBe(softNavAggregate.initialPageLoadInteraction)

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: performance.now() }])
  const currentTime = performance.now()
  expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionInProgress) // UI interaction is chosen over initialPageLoad

  softNavAggregate.interactionInProgress.forceSave = true
  expect(softNavAggregate.interactionInProgress.done()).toEqual(true) // this would mark the ixn as finished and queued for harvest
  expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionsToHarvest.get()[0].data[0]) // queued+completed UI interaction is STILL chosen over initialPageLoad

  softNavAggregate.interactionsToHarvest.get()[0].data[0].status = 'cancelled'
  expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.initialPageLoadInteraction) // cancelled ixn not considered (even if queued--not possible atm)
  const holdIxn = softNavAggregate.interactionsToHarvest.get()[0].data[softNavAggregate.interactionsToHarvest.get()[0].data.length - 1]
  expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.initialPageLoadInteraction) // cancelled (untracked) ixn not considered; falls back to iPL

  const ttfbSubscriber = jest.mocked(ttfbModule.timeToFirstByte.subscribe).mock.calls[0][0]
  ttfbSubscriber({ attrs: { navigationEntry: { loadEventEnd: performance.now() } } })
  expect(softNavAggregate.getInteractionFor(performance.now())).toBeUndefined() // no in progress ixn and iPL has already closed

  holdIxn.status = 'finished'
  // now we have an array of 2: [completed route-change, completed iPL] wherein the route-change duration is wholly within the iPL duration
  expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionsToHarvest.get()[0].data[0])
})

test('interactions are backed up when pre harvesting', () => {
  const ttfbSubscriber = jest.mocked(ttfbModule.timeToFirstByte.subscribe).mock.calls[0][0]
  ttfbSubscriber({ attrs: { navigationEntry: { loadEventEnd: performance.now() } } })
  softNavAggregate.makeHarvestPayload(true) // this flag is on during typical interval harvests except for unload

  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0)
  softNavAggregate.interactionsToHarvest.reloadSave()
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1)
})

test('calling done on the initialPageLoad actually closes it correctly', () => {
  expect(softNavAggregate.initialPageLoadInteraction).toBeTruthy()
  let endTime = performance.now()
  let ipl = softNavAggregate.initialPageLoadInteraction
  softNavAggregate.initialPageLoadInteraction.done(endTime)
  expect(softNavAggregate.initialPageLoadInteraction).toBeNull()
  expect(ipl.end).toEqual(endTime)
  expect(ipl.status).toEqual(INTERACTION_STATUS.FIN)
  expect(softNavAggregate.interactionsToHarvest.get()[0].data).toEqual([ipl])
})

describe('back up buffer is cleared when', () => { // prevent mem leak
  beforeEach(() => {
    const ttfbSubscriber = jest.mocked(ttfbModule.timeToFirstByte.subscribe).mock.calls[0][0]
    ttfbSubscriber({ attrs: { navigationEntry: { loadEventEnd: performance.now() } } })
    softNavAggregate.makeHarvestPayload(true)
  })

  test('harvest was blocked, or sent successfully without retry response', () => {
    softNavAggregate.postHarvestCleanup({ sent: true, retry: false }) // when HTTP status returns 0
    expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0)

    softNavAggregate.interactionsToHarvest.reloadSave() // backup buffer does not hold onto stale data
    expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0)
  })
  test('harvest is sent and got a retry response', () => {
    softNavAggregate.postHarvestCleanup({ sent: true, retry: true })
    expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1)

    softNavAggregate.interactionsToHarvest.reloadSave() // backup buffer does not duplicate retrying data
    expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1)
  })
})
