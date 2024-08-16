import { SoftNav } from '../../../src/features/soft_navigations'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { FEATURE_NAME } from '../../../src/features/soft_navigations/constants'
import * as HMod from '../../../src/common/event-emitter/handle'
import { now } from '../../../src/common/timing/now'
import { Obfuscator } from '../../../src/common/util/obfuscate'
import * as configModule from '../../../src/common/config/config'

jest.useFakeTimers({ doNotFake: ['performance', 'requestAnimationFrame'] })

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
  getInfo: jest.fn().mockReturnValue({}),
  getRuntime: jest.fn()
}))
const aggregator = new Aggregator({ agentIdentifier: 'abcd', ee })

beforeEach(() => {
  jest.mocked(configModule.getRuntime).mockReturnValue({ obfuscator: new Obfuscator() })
})

describe('soft navigations', () => {
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
    // document.dispatchEvent(new Event('click')) // feature only listens for UI events that has addEventListener callbacks tied to it
    // expect(handleSpy).not.toHaveBeenCalled()
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

  // const _setTimeout = global.setTimeout

  let executeTTFB
  jest.doMock('../../../src/common/vitals/time-to-first-byte', () => {
    return {
      __esModule: true,
      timeToFirstByte: {
        subscribe: jest.fn(cb => { executeTTFB = cb })
      }
    }
  })
  describe('aggregate', () => {
    let softNavInstrument, softNavAggregate
    beforeEach(async () => {
      softNavInstrument = new SoftNav('abcd', aggregator)
      importAggregatorFn()
      await expect(softNavInstrument.onAggregateImported).resolves.toEqual(true)
      softNavAggregate = softNavInstrument.featAggregate
      softNavAggregate.ee.emit('rumresp', [{ spa: 1 }])
    })

    test('processes regular interactions', () => {
      expect(softNavAggregate.domObserver).toBeTruthy()
      expect(softNavAggregate.initialPageLoadInteraction).toBeTruthy()

      executeTTFB({ attrs: { navigationEntry: { loadEventEnd: 123 } } })
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
      jest.advanceTimersByTime(30000) // current default: 30 seconds
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

    test('double precision Event DOMHighResTimestamp (microsec) is floored to ms and isActiveDuring with now() works', () => {
      const preciseCurrentTime = performance.now()
      const currentTime = now() // this value is expected to be a truncated version of preciseCurrentTime, e.g. 421 ms vs 421.291 ms

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
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionsToHarvest[0]) // queued+completed UI interaction is STILL chosen over initialPageLoad

      softNavAggregate.interactionsToHarvest[0].status = 'cancelled'
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.initialPageLoadInteraction) // cancelled ixn not considered (even if queued--not possible atm)
      const holdIxn = softNavAggregate.interactionsToHarvest.pop()
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.initialPageLoadInteraction) // cancelled (untracked) ixn not considered; falls back to iPL

      executeTTFB({ attrs: { navigationEntry: { loadEventEnd: performance.now() } } })
      expect(softNavAggregate.getInteractionFor(performance.now())).toBeUndefined() // no in progress ixn and iPL has already closed

      holdIxn.status = 'finished'
      softNavAggregate.interactionsToHarvest.unshift(holdIxn)
      // now we have an array of 2: [completed route-change, completed iPL] wherein the route-change duration is wholly within the iPL duration
      expect(softNavAggregate.getInteractionFor(currentTime)).toBe(softNavAggregate.interactionsToHarvest[0])
    })

    test('interactions are backed up when pre harvesting', () => {
      executeTTFB({ attrs: { navigationEntry: { loadEventEnd: performance.now() } } })
      softNavAggregate.onHarvestStarted({ retry: true }) // this flag is on during typical interval harvests except for unload

      expect(softNavAggregate.interactionsToHarvest.length).toEqual(0)
      expect(softNavAggregate.interactionsAwaitingRetry.length).toEqual(1)
    })

    describe('back up buffer is cleared when', () => { // prevent mem leak
      beforeEach(() => {
        executeTTFB({ attrs: { navigationEntry: { loadEventEnd: performance.now() } } })
        softNavAggregate.onHarvestStarted({ retry: true })
      })

      test('harvest was blocked', () => {
        softNavAggregate.onHarvestFinished({ sent: false }) // when HTTP status returns 0
        expect(softNavAggregate.interactionsAwaitingRetry.length).toEqual(0)
      })
      test('harvest is sent but got a retry response', () => {
        softNavAggregate.onHarvestFinished({ sent: true, retry: true })
        expect(softNavAggregate.interactionsAwaitingRetry.length).toEqual(0)
        expect(softNavAggregate.interactionsToHarvest.length).toEqual(1) // ixn goes from backup back into the main pending buffer
      })
      test('harvest is sent fully and successfully', () => {
        softNavAggregate.onHarvestFinished({ sent: true })
        expect(softNavAggregate.interactionsAwaitingRetry.length).toEqual(0)
        expect(softNavAggregate.interactionsToHarvest.length).toEqual(0)
      })
    })
  })
})
