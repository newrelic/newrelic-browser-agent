import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as SoftNav } from '../../../src/features/soft_navigations/instrument'
import * as ttfbModule from '../../../src/common/vitals/time-to-first-byte'
import { INTERACTION_STATUS, NO_LONG_TASK_WINDOW, POPSTATE_MERGE_WINDOW, POPSTATE_TRIGGER } from '../../../src/features/soft_navigations/constants'

let mainAgent

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'performance'] }) // to aid new long task window heuristics as default ixn will need to wait additional 5s to finish
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
  jest.clearAllTimers() // prevents the IPL harvest after RUM flags w/ setTimeout of 0; this is for better test consistency
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

test('processes interaction heuristics', () => {
  expect(softNavAggregate.domObserver).toBeTruthy()
  expect(softNavAggregate.initialPageLoadInteraction).toBeTruthy()

  const ttfbSubscriber = jest.mocked(ttfbModule.timeToFirstByte.subscribe).mock.calls[0][0]
  ttfbSubscriber({ attrs: { navigationEntry: { loadEventEnd: 123 } } })
  expect(softNavAggregate.initialPageLoadInteraction).toBeNull()
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1)

  softNavAggregate.ee.emit('newURL', [234, 'new_location'])
  softNavAggregate.ee.emit('newDom', [235])
  expect(softNavAggregate.interactionInProgress).toBeNull() // neither history or dom should initiate an interaction

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 345 }])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  expect(softNavAggregate.interactionInProgress.status).toEqual(INTERACTION_STATUS.IP)
  softNavAggregate.ee.emit('newDom', [346])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  expect(softNavAggregate.interactionInProgress.domTimestamp).toEqual(0)

  softNavAggregate.ee.emit('newURL', [347, '' + window.location])
  expect(softNavAggregate.interactionInProgress.historyTimestamp).toEqual(0) // new url cannot be the same as current
  softNavAggregate.ee.emit('newURL', [347, 'some_new_url'])
  expect(softNavAggregate.interactionInProgress).toBeTruthy() // history doesn't call 'done' on the ixn (chronological order enforcement)
  expect(softNavAggregate.interactionInProgress.historyTimestamp).toEqual(347)

  softNavAggregate.ee.emit('newDom', [345])
  expect(softNavAggregate.interactionInProgress).toBeTruthy() // dom has to be aka fired after history
  expect(softNavAggregate.interactionInProgress.domTimestamp).toEqual(0)

  softNavAggregate.ee.emit('newDom', [348.5])
  jest.advanceTimersByTime(1)
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  expect(softNavAggregate.interactionInProgress.domTimestamp).toEqual(348.5)
  expect(softNavAggregate.interactionInProgress.status).toEqual(INTERACTION_STATUS.PF)

  jest.advanceTimersByTime(NO_LONG_TASK_WINDOW) // advance time to allow the pending-finish ixn to close, simulating no long task
  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(softNavAggregate.domObserver.cb).toBeUndefined() // observer should be disconnected after ixn done
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(2)
  expect(softNavAggregate.interactionsToHarvest.get()[0].data[1].end).toEqual(348.5) // check end time for the ixn is as expected
})

test('UI driven interactions have an auto cancel timeout', async () => {
  expect(softNavAggregate.initialPageLoadInteraction.cancellationTimer).toBeUndefined()

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  expect(softNavAggregate.interactionInProgress).toBeTruthy()
  jest.runAllTimers()

  expect(softNavAggregate.interactionInProgress).toBeNull()
  expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0) // since initialPageLoad ixn hasn't closed, and we expect that UI ixn to have been cancelled
})

test('existing UI triggered interaction is cancelled & replaced on a new UI event', async () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'click', timeStamp: 100, target: { tagName: 'a' } }])
  const currentIxn = softNavAggregate.interactionInProgress
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 110 }]) // keep in mind: debounce logic is in the instrument part
  expect(softNavAggregate.interactionInProgress).not.toBe(currentIxn)
  expect(softNavAggregate.interactionInProgress.trigger).toEqual('keydown')
  expect(currentIxn.status).toEqual(INTERACTION_STATUS.CAN) // previous ixn should be cancelled
})

describe('long task considerations', () => {
  test('pending-finish interaction clears auto cancellation timer', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    expect(jest.getTimerCount()).toEqual(1) // the ixn cancellationTimer
    expect(softNavAggregate.interactionInProgress.cancellationTimer).toBeTruthy()
    expect(softNavAggregate.interactionInProgress.watchLongtaskTimer).toBeUndefined()

    softNavAggregate.ee.emit('newURL', [101, 'new_location'])
    softNavAggregate.ee.emit('newDom', [102])
    expect(softNavAggregate.interactionInProgress).toBeTruthy()
    expect(softNavAggregate.interactionInProgress.status).toEqual(INTERACTION_STATUS.PF)
    expect(jest.getTimerCount()).toEqual(1) // cancellationTimer should be cleared, watchLongtaskTimer is set
    expect(softNavAggregate.interactionInProgress.watchLongtaskTimer).toBeTruthy()
  })

  test('watchLongtaskTimer is not duplicated on back-to-back newDom events', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    clearTimeout(softNavAggregate.interactionInProgress.cancellationTimer)
    expect(jest.getTimerCount()).toEqual(0)

    softNavAggregate.ee.emit('newURL', [101, 'new_location'])
    softNavAggregate.ee.emit('newDom', [102])
    expect(jest.getTimerCount()).toEqual(1)
    const firstTimerId = softNavAggregate.interactionInProgress.watchLongtaskTimer
    softNavAggregate.ee.emit('newDom', [103])
    expect(jest.getTimerCount()).toEqual(1)
    expect(softNavAggregate.interactionInProgress.watchLongtaskTimer).toEqual(firstTimerId) // timer should not be reset

    const ixn = softNavAggregate.interactionInProgress
    jest.runAllTimers()
    expect(ixn.end).toEqual(103) // but end time should still be latest newDom time
  })

  test('lt extends interaction duration', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    softNavAggregate.ee.emit('newURL', [500, 'new_location'])
    softNavAggregate.ee.emit('newDom', [1000]) // if ixn naturally ended here, it would have end time of 1000

    jest.advanceTimersByTime(1000)
    softNavAggregate.ee.emit('long-task', [{ start: 1500, end: 2000 }]) // at T=1000, the 5s watch window started; at T=2000, a long task is reported
    jest.advanceTimersByTime(NO_LONG_TASK_WINDOW - 1000) // this is the time at which the ixn should have ended IF there were no long task; we're checking that the timeout was reset
    expect(softNavAggregate.interactionInProgress).toBeTruthy()
    expect(softNavAggregate.interactionInProgress.status).toEqual(INTERACTION_STATUS.PF) // ixn is still pending

    const ixn = softNavAggregate.interactionInProgress
    jest.advanceTimersByTime(1000) // T=6000, the ixn should end as there were no more long tasks
    expect(softNavAggregate.interactionInProgress).toBeNull()
    expect(ixn.status).toEqual(INTERACTION_STATUS.FIN)
    expect(ixn.end).toEqual(2000) // the ixn end time is set to the long task end time rather than the earlier newDom time
  })

  test('multiple lt extend interaction duration correctly', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    softNavAggregate.ee.emit('newURL', [500, 'new_location'])
    softNavAggregate.ee.emit('newDom', [1000])

    jest.advanceTimersByTime(2000)
    softNavAggregate.ee.emit('long-task', [{ end: 3000 }])
    jest.advanceTimersByTime(500)
    softNavAggregate.ee.emit('long-task', [{ end: 3500 }])
    jest.advanceTimersByTime(3500)
    softNavAggregate.ee.emit('long-task', [{ end: 7000 }])
    expect(softNavAggregate.interactionInProgress).toBeTruthy()

    const ixn = softNavAggregate.interactionInProgress
    jest.advanceTimersByTime(NO_LONG_TASK_WINDOW)
    expect(ixn.end).toEqual(7000) // the ixn end time is set to the last long task end time
  })

  test('pending-finish interaction is finished on a new UI event', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    softNavAggregate.ee.emit('newURL', [500, 'new_location'])
    softNavAggregate.ee.emit('newDom', [1000])
    expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(0)

    jest.advanceTimersByTime(2000)
    const prevIxn = softNavAggregate.interactionInProgress
    expect(prevIxn).toBeTruthy()

    softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 3000 }])
    expect(softNavAggregate.interactionsToHarvest.get()[0].data.length).toEqual(1) // the previous ixn should be buffered for harvest
    expect(prevIxn.status).toEqual(INTERACTION_STATUS.FIN) // the previous ixn should be marked as finished
    expect(prevIxn.end).toEqual(1000)
    expect(softNavAggregate.interactionInProgress).toBeTruthy() // a new ixn should be created
    expect(softNavAggregate.interactionInProgress).not.toEqual(prevIxn)
  })
})

test('double precision Event DOMHighResTimestamp (microsec) is floored to ms and isActiveDuring with now() works', () => {
  const preciseCurrentTime = performance.now()
  const currentTime = Date.now() // this value is expected to be a truncated version of preciseCurrentTime, e.g. 421 ms vs 421.291 ms

  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: preciseCurrentTime }])
  expect(softNavAggregate.interactionInProgress.isActiveDuring(currentTime)).toBeTruthy()
  expect(Number.isInteger(softNavAggregate.interactionInProgress.start)).toBeTruthy()
})

describe('getInteractionFor', () => {
  test('grabs the right active interaction for a timestamp', () => {
  // initial page load ixn is ongoing at this point
    expect(softNavAggregate.getInteractionFor(performance.now())).toBe(softNavAggregate.initialPageLoadInteraction)

    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: performance.now() }])
    const currentTime = performance.now()
    expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionInProgress) // UI interaction is chosen over initialPageLoad

    softNavAggregate.interactionInProgress.forceSave = true
    expect(softNavAggregate.interactionInProgress.done()).toEqual(true) // this would mark the ixn as finished and queued for harvest
    expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionsToHarvest.get()[0].data[0]) // queued+completed UI interaction is STILL chosen over initialPageLoad
    expect(softNavAggregate.interactionsToHarvest.get()[0].data[0].status).toEqual(INTERACTION_STATUS.FIN)

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

  test('does consider long task window after hard conditions are met, prior to finish', () => {
    const ipl = softNavAggregate.initialPageLoadInteraction
    softNavAggregate.initialPageLoadInteraction.done(100)

    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    const ixn = softNavAggregate.interactionInProgress
    softNavAggregate.ee.emit('newURL', [200, 'new_location'])
    expect(ixn.status).toEqual(INTERACTION_STATUS.IP)
    softNavAggregate.ee.emit('newDom', [300])
    expect(ixn.status).toEqual(INTERACTION_STATUS.PF)

    expect(softNavAggregate.interactionInProgress).toBe(ixn)
    expect(softNavAggregate.getInteractionFor(250)).toBe(ixn)
    expect(softNavAggregate.getInteractionFor(50)).toBe(ipl)
    expect(softNavAggregate.getInteractionFor(350)).toBe(ixn)

    softNavAggregate.ee.emit('long-task', [{ end: 500 }])
    expect(softNavAggregate.getInteractionFor(400)).toBe(ixn)
    expect(softNavAggregate.getInteractionFor(600)).toBe(ixn)
  })

  test('does not consider long task window after interaction is finished', () => {
    softNavAggregate.initialPageLoadInteraction.done(100)
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    const ixn = softNavAggregate.interactionInProgress
    softNavAggregate.ee.emit('newURL', [200, 'new_location'])
    softNavAggregate.ee.emit('newDom', [300])

    expect(softNavAggregate.interactionInProgress).toBe(ixn)
    expect(softNavAggregate.getInteractionFor(250)).toBe(ixn)
    softNavAggregate.ee.emit('long-task', [{ end: 500 }])
    softNavAggregate.interactionInProgress.done(500)

    expect(softNavAggregate.getInteractionFor(400)).toBe(ixn)
    expect(softNavAggregate.getInteractionFor(600)).toBeUndefined()
  })
})

describe('popstate interactions', () => {
  test('do become route change if first interaction on page', () => {
    const origUrl = window.location.href
    const newUrl = 'http://myurl.com'
    window.location.href = newUrl // location is normally updated by the time popstate event occurs

    softNavAggregate.ee.emit('newUIEvent', [{ type: POPSTATE_TRIGGER, timeStamp: 100 }])
    const ixn = softNavAggregate.interactionInProgress
    expect(ixn).toBeTruthy()
    expect(ixn.trigger).toEqual(POPSTATE_TRIGGER)

    softNavAggregate.ee.emit('newURL', [101, newUrl])
    expect(ixn.newURL).toEqual(newUrl)
    expect(ixn.oldURL).toEqual(origUrl)
    expect(softNavAggregate.latestHistoryUrl).toEqual(newUrl)

    const newUrl2 = 'http://myurl2.com'
    softNavAggregate.ee.emit('newURL', [102, newUrl2]) // back to back url changes should update the newURL
    expect(ixn.newURL).toEqual(newUrl2)
    expect(ixn.oldURL).toEqual(origUrl)
    expect(softNavAggregate.latestHistoryUrl).toEqual(newUrl2)
  })

  test('do not affect each other when emitted back-to-back', () => {
    const firstUrl = 'http://myurl.com'
    softNavAggregate.ee.emit('newUIEvent', [{ type: POPSTATE_TRIGGER, timeStamp: 100 }])
    softNavAggregate.ee.emit('newURL', [101, firstUrl])

    const secondUrl = 'http://myotherurl.com'
    softNavAggregate.ee.emit('newUIEvent', [{ type: POPSTATE_TRIGGER, timeStamp: 105 }])
    softNavAggregate.ee.emit('newURL', [106, secondUrl])

    expect(softNavAggregate.interactionInProgress.oldURL).toEqual(firstUrl)
    expect(softNavAggregate.interactionInProgress.newURL).toEqual(secondUrl)
    expect(softNavAggregate.latestHistoryUrl).toEqual(secondUrl)
  })

  test('are merged into an immediately preceding click', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'click', timeStamp: 100, target: { tagName: 'a' } }])
    softNavAggregate.ee.emit('newUIEvent', [{ type: POPSTATE_TRIGGER, timeStamp: 105 }])
    softNavAggregate.ee.emit('newURL', [110, 'myurl.com'])

    expect(softNavAggregate.interactionInProgress.trigger).toEqual('click')
    expect(softNavAggregate.interactionInProgress.oldURL).toEqual(window.location.href)
    expect(softNavAggregate.interactionInProgress.newURL).toEqual('myurl.com')
  })

  test('are NOT merged into a preceeding click if click happened some time ago', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'click', timeStamp: 100, target: { tagName: 'a' } }])
    softNavAggregate.ee.emit('newUIEvent', [{ type: POPSTATE_TRIGGER, timeStamp: 101 + POPSTATE_MERGE_WINDOW }])

    expect(softNavAggregate.interactionInProgress.trigger).toEqual(POPSTATE_TRIGGER)
  })

  test('are not affected by an immediately preceding history change', () => {
    softNavAggregate.ee.emit('newURL', [100, 'myfirsturl.com'])
    softNavAggregate.ee.emit('newUIEvent', [{ type: POPSTATE_TRIGGER, timeStamp: 105 }])
    softNavAggregate.ee.emit('newURL', [110, 'mysecondurl.com'])

    expect(softNavAggregate.interactionInProgress.trigger).toEqual(POPSTATE_TRIGGER)
    expect(softNavAggregate.interactionInProgress.oldURL).toEqual('myfirsturl.com')
    expect(softNavAggregate.interactionInProgress.newURL).toEqual('mysecondurl.com')
  })
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
