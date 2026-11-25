import qp from '@newrelic/nr-querypack'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { EventContext } from '../../../src/common/event-emitter/event-context'
import { now } from '../../../src/common/timing/now'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { AJAX_REASONS } from '../../../src/features/ajax/constants'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { resetAgent, setupAgent } from '../setup-agent'

let fakeAgent, ajaxAggregate

/**
 * Creates the ajax feature with the given ajax init options and returns its aggregate, optionally before draining its buffered events.
 * @param {Object} ajaxInit - Overrides for init.ajax
 * @param {boolean} [shouldDrain=true] - Whether to drain the aggregate right away
 * @returns {Promise<Object>} The ajax aggregate instance
 */
async function setupAjaxAggregate (ajaxInit = {}, shouldDrain = true) {
  fakeAgent = setupAgent({ init: { ajax: ajaxInit } })
  const ajaxInstrument = new Ajax(fakeAgent)
  await new Promise(process.nextTick)
  const aggregate = ajaxInstrument.featAggregate
  delete fakeAgent.features[FEATURE_NAMES.softNav]
  /* Keep harvests (e.g. the one scheduled right after draining) from emptying the event buffer under test. */
  jest.spyOn(fakeAgent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => ({ ranSend: false }))
  if (shouldDrain) {
    aggregate.ee.emit('rumresp', [])
    aggregate.drain()
  } else {
    /* Test agents share the global emitter's backlog, where an earlier test's drain leaves this group nulled out (no longer buffering).
     * Clearing it restores the fresh-page state, where events handled before the drain are buffered. */
    delete aggregate.ee.backlog[FEATURE_NAMES.ajax]
  }
  return aggregate
}

/**
 * Builds an ajax context resembling one the instrument creates when a request is sent.
 * @returns {EventContext}
 */
function createSentRequestContext () {
  const ctx = new EventContext()
  ctx.params = { method: 'GET', host: 'example.com:443', hostname: 'example.com', pathname: '/hanging' }
  ctx.metrics = { txSize: 12 }
  ctx.startTime = now()
  return ctx
}

function resolveRequest (ctx, endTime, status = 200) {
  ajaxAggregate.ee.emit('xhr', [{ ...ctx.params, status }, { txSize: 12, rxSize: 34, cbTime: 0 }, ctx.startTime, endTime, 'xhr'], ctx)
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick'] })
  jest.spyOn(handleModule, 'handle')
})

afterEach(() => {
  jest.useRealTimers()
  resetAgent(fakeAgent)
  jest.clearAllMocks()
})

describe('with ajax.timeout disabled (default)', () => {
  beforeEach(async () => {
    ajaxAggregate = await setupAjaxAggregate()
  })

  test('a pending request is never reported as timed out', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.advanceTimersByTime(10 * 60 * 1000)

    expect(ajaxAggregate.events.get().length).toEqual(0)
  })

  test('a slow request is reported with its real outcome and no reason', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.advanceTimersByTime(60000)
    resolveRequest(ctx, now())

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0].status).toEqual(200)
    expect(events[0].reason).toBeUndefined()
  })

  test('a request still pending on page unload is not reported, and no harvest is triggered', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    window.dispatchEvent(new Event('pagehide'))

    expect(ajaxAggregate.events.get().length).toEqual(0)
    expect(ctx.ended).toBeUndefined()
    expect(fakeAgent.runtime.harvester.triggerHarvestFor).not.toHaveBeenCalledWith(ajaxAggregate, { isFinalHarvest: true })
  })
})

describe('with ajax.timeout enabled', () => {
  beforeEach(async () => {
    ajaxAggregate = await setupAjaxAggregate({ timeout: 5 })
  })

  test('a request that does not resolve in time is reported once as timed out with status 0', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.advanceTimersByTime(4999)
    expect(ajaxAggregate.events.get().length).toEqual(0)

    jest.advanceTimersByTime(1)
    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0]).toEqual(expect.objectContaining({
      status: 0,
      reason: AJAX_REASONS.TIMED_OUT,
      path: '/hanging',
      requestSize: 12,
      responseSize: undefined,
      startTime: ctx.startTime,
      endTime: ctx.startTime + 5000
    }))
  })

  test('a timed out request is marked ended, so the instrument skips reporting its late response', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    expect(ctx.ended).toBeUndefined()
    jest.advanceTimersByTime(5000)

    expect(ctx.ended).toEqual(true)
  })

  test('a timed out multi-target request is reported once per target', () => {
    const ctx = createSentRequestContext()
    ctx.targets = [undefined, undefined]
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.advanceTimersByTime(5000)

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(2)
    expect(events.every(event => event.reason === AJAX_REASONS.TIMED_OUT)).toEqual(true)
  })

  test('a response that arrived in time but is still being finished up (e.g. a fetch body being read) is not timed out', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['fetch'], ctx)
    jest.advanceTimersByTime(4000)
    ctx.endTime = now() // response arrived; the instrument reports only once the body is read
    jest.advanceTimersByTime(2000)
    expect(ajaxAggregate.events.get().length).toEqual(0)
    expect(ctx.ended).toBeUndefined()

    resolveRequest(ctx, ctx.endTime)
    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0].status).toEqual(200)
    expect(events[0].reason).toBeUndefined()
  })

  test('a response that arrived in time but whose report never comes is still reported on page unload', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['fetch'], ctx)
    ctx.endTime = ctx.startTime + 1000
    jest.advanceTimersByTime(10000)
    window.dispatchEvent(new Event('pagehide'))

    expect(ajaxAggregate.events.get()[0]).toEqual(expect.objectContaining({ status: 0, reason: AJAX_REASONS.PAGE_UNLOADED }))
  })

  test('a request that resolves in time is reported normally and its timer is cleared', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.advanceTimersByTime(1000)
    resolveRequest(ctx, now())
    jest.advanceTimersByTime(10000)

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0].status).toEqual(200)
    expect(events[0].reason).toBeUndefined()
  })

  test('a request resolving past the timeout before its timer fires is still reported as timed out', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    resolveRequest(ctx, ctx.startTime + 7000) // e.g. timers throttled in a background tab

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0]).toEqual(expect.objectContaining({ status: 0, reason: AJAX_REASONS.TIMED_OUT, endTime: ctx.startTime + 5000 }))
  })

  test('a timed out fetch uses the request size kept on its context', () => {
    const ctx = createSentRequestContext()
    ctx.metrics = {}
    ctx.txSize = 99
    ajaxAggregate.ee.emit('xhr-pending', ['fetch'], ctx)
    jest.advanceTimersByTime(5000)

    expect(ajaxAggregate.events.get()[0]).toEqual(expect.objectContaining({ type: 'fetch', requestSize: 99, reason: AJAX_REASONS.TIMED_OUT }))
  })

  test('the reason is serialized as an attribute on the AjaxRequest', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.advanceTimersByTime(5000)

    const [decodedEvent] = qp.decode(ajaxAggregate.makeHarvestPayload(false).body)
    expect(decodedEvent.status).toEqual(0)
    expect(decodedEvent.children).toEqual(expect.arrayContaining([{ type: 'stringAttribute', key: 'reason', value: AJAX_REASONS.TIMED_OUT }]))
  })
})

describe('requests buffered before the aggregate loaded', () => {
  test('a request that resolved in time is not reported as timed out, even if the aggregate loads after the timeout elapsed', async () => {
    ajaxAggregate = await setupAjaxAggregate({ timeout: 5 }, false)
    const ctx = createSentRequestContext()
    handleModule.handle('xhr-pending', ['xhr'], ctx, FEATURE_NAMES.ajax, ajaxAggregate.ee)
    resolveRequestViaHandle(ctx, ctx.startTime + 100)

    jest.advanceTimersByTime(20000) // aggregate drains well after the request's timeout would have elapsed
    ajaxAggregate.ee.emit('rumresp', [])
    ajaxAggregate.drain()
    jest.advanceTimersByTime(1) // lets any already-due timeout timer fire

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0].status).toEqual(200)
    expect(events[0].reason).toBeUndefined()
  })

  test('a request still pending past its timeout is reported as timed out once the aggregate drains', async () => {
    ajaxAggregate = await setupAjaxAggregate({ timeout: 5 }, false)
    const ctx = createSentRequestContext()
    handleModule.handle('xhr-pending', ['xhr'], ctx, FEATURE_NAMES.ajax, ajaxAggregate.ee)

    jest.advanceTimersByTime(20000)
    ajaxAggregate.ee.emit('rumresp', [])
    ajaxAggregate.drain()
    jest.advanceTimersByTime(1) // lets any already-due timeout timer fire

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0]).toEqual(expect.objectContaining({ status: 0, reason: AJAX_REASONS.TIMED_OUT, endTime: ctx.startTime + 5000 }))
  })

  function resolveRequestViaHandle (ctx, endTime) {
    handleModule.handle('xhr', [{ ...ctx.params, status: 200 }, { txSize: 12, rxSize: 34, cbTime: 0 }, ctx.startTime, endTime, 'xhr'], ctx, FEATURE_NAMES.ajax, ajaxAggregate.ee)
  }
})

describe('page unload', () => {
  beforeEach(async () => {
    ajaxAggregate = await setupAjaxAggregate({ timeout: 60 })
  })

  test('pending requests are reported as pageUnloaded with status 0 and sent in a final harvest', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.advanceTimersByTime(3000)
    window.dispatchEvent(new Event('pagehide'))

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0]).toEqual(expect.objectContaining({ status: 0, reason: AJAX_REASONS.PAGE_UNLOADED, endTime: ctx.startTime + 3000 }))
    expect(fakeAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledWith(ajaxAggregate, { isFinalHarvest: true })
  })

  test('an unloaded request is marked ended, so the instrument skips reporting the browser cancelling it', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    window.dispatchEvent(new Event('pagehide'))

    expect(ctx.ended).toEqual(true)
  })

  test('hiding the page does not report pending requests', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    resolveRequest(ctx, now())

    const events = ajaxAggregate.events.get()
    expect(events.length).toEqual(1)
    expect(events[0].status).toEqual(200)
    expect(events[0].reason).toBeUndefined()
  })

  test('pending requests are still reported and sent in a final harvest when the page was hidden (and final-harvested) before unloading', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(ajaxAggregate.events.get().length).toEqual(0)

    window.dispatchEvent(new Event('pagehide'))
    expect(ajaxAggregate.events.get()[0]).toEqual(expect.objectContaining({ status: 0, reason: AJAX_REASONS.PAGE_UNLOADED }))
    expect(fakeAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledWith(ajaxAggregate, { isFinalHarvest: true })
  })

  test('unloaded requests skip soft navigations, whose interactions were already finalized', () => {
    fakeAgent.features[FEATURE_NAMES.softNav] = {} // truthy to simulate soft nav being present
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    window.dispatchEvent(new Event('pagehide'))

    expect(handleModule.handle).not.toHaveBeenCalledWith('ajax', expect.anything(), undefined, FEATURE_NAMES.softNav, expect.anything())
    expect(ajaxAggregate.events.get()[0].reason).toEqual(AJAX_REASONS.PAGE_UNLOADED)
  })

  test('requests that resolved after the final harvest are still sent on unload, with nothing pending', () => {
    const ctx = createSentRequestContext()
    ajaxAggregate.ee.emit('xhr-pending', ['xhr'], ctx)
    resolveRequest(ctx, now(), 0) // e.g. the browser cancelling it as it closes a backgrounded tab, just before pagehide
    window.dispatchEvent(new Event('pagehide'))

    expect(ajaxAggregate.events.get().length).toEqual(1)
    expect(fakeAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledWith(ajaxAggregate, { isFinalHarvest: true })
  })
})
