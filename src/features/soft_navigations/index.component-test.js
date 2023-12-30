import { SoftNav } from '.'
import { Aggregator } from '../../common/aggregate/aggregator'
import { ee } from '../../common/event-emitter/contextual-ee'
import { FEATURE_NAME } from './constants'
import * as HMod from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'

let importAggregatorFn
jest.mock('../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global,
  initialLocation: '' + global.location
}))
jest.mock('../../common/window/load', () => ({
  __esModule: true,
  onWindowLoad: jest.fn(cb => { importAggregatorFn = cb })
}))
jest.mock('../../common/config/config', () => ({
  __esModule: true,
  originals: {
    MO: class {
      constructor (callback) { this.cb = callback }
      disconnect () { this.cb = undefined }
      observe (element, initObject) { this.cb() }
    },
    RAF: global.requestAnimationFrame
  },
  getConfigurationValue: jest.fn(),
  isConfigured: jest.fn().mockReturnValue(true),
  getInfo: jest.fn().mockReturnValue({})
}))
const aggregator = new Aggregator({ agentIdentifier: 'abcd', ee })

describe('soft navigations', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('instrument detects heuristic steps', async () => {
    const handleSpy = jest.spyOn(HMod, 'handle').mockImplementation(() => {})
    new SoftNav('abcd', aggregator)
    expect(importAggregatorFn).toEqual(expect.any(Function))

    history.pushState({}, '/foo')
    expect(handleSpy).toHaveBeenLastCalledWith('newURL', [expect.any(Number), window.location.href], undefined, FEATURE_NAME, expect.any(Object))
    history.replaceState({}, '')
    expect(handleSpy).toHaveBeenLastCalledWith('newURL', [expect.any(Number), window.location.href], undefined, FEATURE_NAME, expect.any(Object))
    window.dispatchEvent(new Event('popstate'))
    expect(handleSpy).toHaveBeenLastCalledWith('newURL', [expect.any(Number), window.location.href], undefined, FEATURE_NAME, expect.any(Object))
    expect(handleSpy).toHaveBeenCalledTimes(3)

    handleSpy.mockClear()
    document.dispatchEvent(new Event('click')) // feature only listens for UI events that has addEventListener callbacks tied to it
    expect(handleSpy).not.toHaveBeenCalled()
    let count = 0
    document.addEventListener('click', function () { count++ })
    document.addEventListener('keydown', function () { count++ })
    document.addEventListener('submit', function () { count++ })
    document.dispatchEvent(new Event('click'))
    document.dispatchEvent(new Event('keydown'))
    document.dispatchEvent(new Event('submit'))
    expect(count).toEqual(3)
    expect(handleSpy).toHaveBeenCalledTimes(1) // our processing is debounced (set to 100ms) to fire once on these 3 consecutive UI
    expect(handleSpy).toHaveBeenLastCalledWith('newUIEvent', [expect.any(Event)], undefined, FEATURE_NAME, expect.any(Object))
    expect(handleSpy.mock.calls[0][1][0].type).toEqual('click') // furthermore, the first of the UI is what's captured

    await new Promise(resolve => global.requestAnimationFrame(resolve))
    expect(handleSpy).toHaveBeenCalledTimes(2) // similary, dom change RAF callback should only be fired once instead of thrice
    expect(handleSpy).toHaveBeenLastCalledWith('newDom', [expect.any(Number)], undefined, FEATURE_NAME, expect.any(Object))

    handleSpy.mockRestore()
  })

  describe('aggregate', () => {
    let executeTTFB
    jest.doMock('../../common/vitals/time-to-first-byte', () => {
      return {
        __esModule: true,
        timeToFirstByte: {
          subscribe: jest.fn(cb => { executeTTFB = cb })
        }
      }
    })
    const _setTimeout = global.setTimeout
    global.setTimeout = jest.fn((cb, timeout) => _setTimeout(cb, 500)) // force cancellationTimers to trigger after 0.5 second
    let softNavInstrument, softNavAggregate
    beforeEach(async () => {
      softNavInstrument = new SoftNav('abcd', aggregator)
      importAggregatorFn()
      await expect(softNavInstrument.onAggregateImported).resolves.toEqual(true)
      softNavAggregate = softNavInstrument.featAggregate
    })

    test('processes regular interactions', () => {
      expect(softNavAggregate.domObserver).toBeTruthy()
      expect(softNavAggregate.scheduler).toBeTruthy()
      expect(softNavAggregate.initialPageLoadInteraction).toBeTruthy()

      executeTTFB({ entries: [{ loadEventEnd: 123 }] })
      expect(softNavAggregate.initialPageLoadInteraction).toBeNull()
      expect(softNavAggregate.interactionsToHarvest.length).toEqual(1)

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
      expect(softNavAggregate.interactionsToHarvest.length).toEqual(2)
      expect(softNavAggregate.interactionsToHarvest[1].end).toEqual(348.5) // check end time for the ixn is as expected
    })

    test('regular interactions have applicable timeouts', async () => {
      expect(softNavAggregate.initialPageLoadInteraction.cancellationTimer).toBeUndefined()

      softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
      expect(softNavAggregate.interactionInProgress).toBeTruthy()
      await new Promise(resolve => _setTimeout(resolve, 501))
      expect(softNavAggregate.interactionInProgress).toBeNull()
      expect(softNavAggregate.interactionsToHarvest.length).toEqual(0) // since initialPageLoad ixn hasn't closed, and we expect that UI ixn to have been cancelled
    })

    test('interactions are replaced by new UI events', async () => {
      softNavAggregate.ee.emit('newUIEvent', [{ type: 'click', timeStamp: 100, target: { tagName: 'a' } }])
      const currentIxn = softNavAggregate.interactionInProgress
      softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 110 }]) // keep in mind: debounce logic is in the instrument part
      expect(softNavAggregate.interactionInProgress).not.toBe(currentIxn)
      expect(softNavAggregate.interactionInProgress.trigger).toEqual('keydown')
    })

    test('getInteractionFor grabs the right active interaction for a timestamp', () => {
      // initial page load ixn is ongoing at this point
      expect(softNavAggregate.getInteractionFor(performance.now())).toBe(softNavAggregate.initialPageLoadInteraction)

      softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: performance.now() }])
      const currentTime = performance.now()
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionInProgress) // UI interaction is chosen over initialPageLoad

      softNavAggregate.interactionInProgress.forceSave = true
      expect(softNavAggregate.interactionInProgress.done()).toEqual(true) // this would mark the ixn as finished and queued for harvest
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionsToHarvest[0]) // queued UI interaction is STILL chosen over initialPageLoad

      softNavAggregate.interactionsToHarvest[0].status = 'cancelled'
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.initialPageLoadInteraction) // cancelled ixn not considered (even if queued--not possible atm)
      const holdIxn = softNavAggregate.interactionsToHarvest.pop()
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.initialPageLoadInteraction) // cancelled (untracked) ixn not considered; falls back to iPL

      executeTTFB({ entries: [{ loadEventEnd: performance.now() }] })
      expect(softNavAggregate.getInteractionFor(performance.now())).toBeUndefined() // no in progress ixn and iPL has already closed

      holdIxn.status = 'finished'
      softNavAggregate.interactionsToHarvest.unshift(holdIxn)
      // now we have an array of 2: [completed route-change, completed iPL] wherein the route-change duration is wholly within the iPL duration
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionsToHarvest[0])
    })
  })

  describe('APIs', () => {
    const INTERACTION_API = 'api-ixn-'
    let softNavInstrument, softNavAggregate, thisCtx
    beforeAll(async () => {
      softNavInstrument = new SoftNav('ab', aggregator)
      importAggregatorFn()
      await expect(softNavInstrument.onAggregateImported).resolves.toEqual(true)
      softNavAggregate = softNavInstrument.featAggregate
    })
    beforeEach(() => {
      softNavAggregate.interactionInProgress = null
      softNavAggregate.interactionsToHarvest = []
      thisCtx = softNavAggregate.ee.context()
    })
    const newrelic = { interaction: (cmd, customTime = now()) => softNavAggregate.ee.emit(INTERACTION_API + cmd, [customTime], thisCtx) }

    test('.interaction gets current or creates new api ixn', () => {
      softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
      expect(softNavAggregate.interactionInProgress).toBeTruthy()
      newrelic.interaction('get')
      expect(thisCtx.associatedInteraction).toBe(softNavAggregate.interactionInProgress)

      softNavAggregate.interactionInProgress.done()
      expect(softNavAggregate.interactionInProgress).toBeNull()
      newrelic.interaction('get')
      expect(softNavAggregate.interactionInProgress.trigger).toEqual('api')
      expect(softNavAggregate.interactionInProgress.cancellationTimer).toBeUndefined()
    })

    test('open api ixn ignores UI events and auto closes after history & dom change', () => {
      newrelic.interaction('get')
      softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
      expect(softNavAggregate.interactionInProgress).toBe(thisCtx.associatedInteraction)
      expect(softNavAggregate.interactionInProgress.trigger).toEqual('api')

      softNavAggregate.ee.emit('newURL', [23, 'example.com'])
      softNavAggregate.ee.emit('newDom', [34])
      expect(softNavAggregate.interactionInProgress).toBeNull()
      expect(thisCtx.associatedInteraction.status).toEqual('finished')
    })

    test('.end closes interactions (by default, cancels them)', () => {
      softNavAggregate.ee.emit('newUIEvent', [{ type: 'submit', timeStamp: 12 }])
      newrelic.interaction('get')
      newrelic.interaction('end')
      expect(thisCtx.associatedInteraction.trigger).toEqual('submit')
      expect(thisCtx.associatedInteraction.status).toEqual('cancelled')

      newrelic.interaction('get')
      newrelic.interaction('end')
      expect(thisCtx.associatedInteraction.trigger).toEqual('api')
      expect(thisCtx.associatedInteraction.status).toEqual('cancelled')
      expect(softNavAggregate.interactionInProgress).toBeNull()
    })

    test('multiple .end on one ixn results in only the first taking effect', () => {
      newrelic.interaction('get')
      thisCtx.associatedInteraction.forceSave = true
      newrelic.interaction('end', 100)
      newrelic.interaction('end', 200)
      newrelic.interaction('end', 300)
      expect(thisCtx.associatedInteraction.end).toEqual(100)
    })

    // This isn't just an API test; it double serves as data validation on the querypack payload output.
    test('multiple finished ixns retain the correct start/end timestamps in payload', () => {
      newrelic.interaction('get', 100)
      thisCtx.associatedInteraction.nodeId = 1
      thisCtx.associatedInteraction.id = 'some_id'
      thisCtx.associatedInteraction.forceSave = true
      newrelic.interaction('end', 200)
      newrelic.interaction('get', 300)
      thisCtx.associatedInteraction.nodeId = 2
      thisCtx.associatedInteraction.id = 'some_other_id'
      thisCtx.associatedInteraction.forceSave = true
      newrelic.interaction('end', 500)
      newrelic.interaction('get', 700)
      thisCtx.associatedInteraction.nodeId = 3
      thisCtx.associatedInteraction.id = 'some_another_id'
      thisCtx.associatedInteraction.forceSave = true
      newrelic.interaction('end', 1000)
      expect(softNavAggregate.interactionsToHarvest.length).toEqual(3)
      // WARN: Double check decoded output & behavior or any introduced bugs before changing the follow line's static string.
      expect(softNavAggregate.onHarvestStarted({}).body.e).toEqual("bel.7;1,,2s,2s,,,'api,'http://localhost/,1,1,,2,!!!!'some_id,'1,!!;;1,,5k,5k,,,'api,'http://localhost/,1,1,,2,!!!!'some_other_id,'2,!!;;1,,go,8c,,,'api,'http://localhost/,1,1,,2,!!!!'some_another_id,'3,!!;")
    })
    // This isn't just an API test; it double serves as data validation on the querypack payload output.
    test('multiple finished ixns with ajax have correct start/end timestamps (in ajax nodes)', () => {
      newrelic.interaction('get', 1.23)
      thisCtx.associatedInteraction.nodeId = 1
      thisCtx.associatedInteraction.id = 'some_id'
      thisCtx.associatedInteraction.forceSave = true
      newrelic.interaction('end', 4.56)
      softNavAggregate.ee.emit('ajax', [{ startTime: 2.34, endTime: 5.67 }])
      thisCtx.associatedInteraction.children[0].nodeId = 2
      softNavAggregate.ee.emit('ajax', [{ startTime: 3.45, endTime: 6.78 }])
      thisCtx.associatedInteraction.children[1].nodeId = 3

      newrelic.interaction('get', 10)
      thisCtx.associatedInteraction.nodeId = 4
      thisCtx.associatedInteraction.id = 'some_other_id'
      thisCtx.associatedInteraction.forceSave = true
      newrelic.interaction('end', 14)
      softNavAggregate.ee.emit('ajax', [{ startTime: 11, endTime: 12 }])
      thisCtx.associatedInteraction.children[0].nodeId = 5
      softNavAggregate.ee.emit('ajax', [{ startTime: 12, endTime: 13 }])
      thisCtx.associatedInteraction.children[1].nodeId = 6
      expect(softNavAggregate.interactionsToHarvest.length).toEqual(2)
      // WARN: Double check decoded output & behavior or any introduced bugs before changing the follow line's static string.
      expect(softNavAggregate.onHarvestStarted({}).body.e).toEqual("bel.7;1,2,1,3,,,'api,'http://localhost/,1,1,,2,!!!!'some_id,'1,!!;2,,1,3,,,,,,,,,,'2,!!!;2,,2,3,,,,,,,,,,'3,!!!;;1,2,9,4,,,'api,'http://localhost/,1,1,,2,!!!!'some_other_id,'4,!!;2,,a,1,,,,,,,,,,'5,!!!;2,,b,1,,,,,,,,,,'6,!!!;")
    })
  })
})
