import { ee } from '../../../../src/common/event-emitter/contextual-ee'
import { Aggregator } from '../../../../src/common/aggregate/aggregator'
import { getConfiguration, getInfo, setInfo, setRuntime } from '../../../../src/common/config/config'
import { TimeKeeper } from '../../../../src/common/timing/time-keeper'
import { configure } from '../../../../src/loaders/configure/configure'
import { EventBuffer } from '../../../../src/features/utils/event-buffer'

const agentId = 'abcd'
const referrerUrl = 'https://test.com'
let genericEventsAgg, timeKeeper

Object.defineProperty(global.document, 'referrer', { value: referrerUrl, configurable: true })

describe('Generic Events aggregate', () => {
  beforeEach(async () => {
    const agent = { agentIdentifier: agentId }
    configure(agent, {
      info: { licenseKey: 'licenseKey', applicationID: 'applicationID' },
      runtime: { isolatedBacklog: false },
      init: {}
    }, 'test', true)

    timeKeeper = new TimeKeeper(agentId, ee.get(agentId))
    timeKeeper.processRumRequest({
      getResponseHeader: jest.fn(() => (new Date()).toUTCString())
    }, 450, 600)
    setRuntime(agentId, { timeKeeper })

    const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')

    genericEventsAgg = new Aggregate(agentId, new Aggregator({ agentIdentifier: agentId, ee }))
  })

  it('should use default values', () => {
    expect(genericEventsAgg).toMatchObject({
      eventsPerHarvest: 1000,
      harvestTimeSeconds: 30,
      referrerUrl: 'https://test.com',
      events: new EventBuffer(),
      retryEvents: new EventBuffer()
    })
  })

  it('should wait for flags - 1', async () => {
    expect(genericEventsAgg.drained).not.toEqual(true)
    genericEventsAgg.ee.emit('rumresp', [{ ins: 1 }])
    await wait(100)
    expect(genericEventsAgg.drained).toEqual(true)
  })

  it('should wait for flags - 0', async () => {
    expect(genericEventsAgg.drained).not.toEqual(true)
    genericEventsAgg.ee.emit('rumresp', [{ ins: 0 }])
    await wait(100)
    expect(genericEventsAgg.blocked).toEqual(true)
  })

  it('should warn if invalid event is provide', async () => {
    console.debug = jest.fn()
    genericEventsAgg.ee.emit('rumresp', [{ ins: 1 }])
    await wait(100)
    genericEventsAgg.addEvent({ name: 'test' })
    expect(console.debug).toHaveBeenCalledWith('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#44', undefined)
  })

  it('should only buffer 64kb of events at a time', async () => {
    genericEventsAgg.ee.emit('rumresp', [{ ins: 1 }])
    await wait(100)
    genericEventsAgg.harvestScheduler.runHarvest = jest.fn()
    genericEventsAgg.addEvent({ name: 'test', eventType: 'x'.repeat(63000) })

    expect(genericEventsAgg.harvestScheduler.runHarvest).not.toHaveBeenCalled()
    genericEventsAgg.addEvent({ name: 1000, eventType: 'x'.repeat(1000) })
    expect(genericEventsAgg.harvestScheduler.runHarvest).toHaveBeenCalled()
  })

  describe('page_actions', () => {
    beforeEach(async () => {
      genericEventsAgg.ee.emit('rumresp', [{ ins: 1 }])
      await wait(100)
    })

    it('should record page actions if not disabled', () => {
      const relativeTimestamp = Math.random() * 1000
      const name = 'name'
      setInfo(agentId, { ...getInfo(agentId), jsAttributes: { globalFoo: 'globalBar' } })
      genericEventsAgg.ee.emit('api-addPageAction', [relativeTimestamp, name, { foo: 'bar' }])
      expect(genericEventsAgg.events.buffer[0]).toMatchObject({
        eventType: 'PageAction',
        timestamp: timeKeeper.convertRelativeTimestamp(relativeTimestamp),
        timeSinceLoad: relativeTimestamp / 1000,
        actionName: name,
        referrerUrl,
        currentUrl: '' + location,
        browserWidth: expect.any(Number),
        browserHeight: expect.any(Number),
        /** event custom attributes */
        foo: 'bar',
        /** agent custom attributes */
        globalFoo: 'globalBar'
      })
    })

    it('event level custom attrs should not override protected attributes', () => {
      const relativeTimestamp = Math.random() * 1000
      const name = 'name'
      genericEventsAgg.ee.emit('api-addPageAction', [relativeTimestamp, name, { eventType: 'BetterPageAction', timestamp: 'BetterTimestamp' }])
      expect(genericEventsAgg.events.buffer[0]).toMatchObject({
        eventType: 'PageAction',
        timestamp: expect.any(Number)
      })
    })

    it('agent level custom attrs should not override protected attributes', () => {
      const relativeTimestamp = Math.random() * 1000
      const name = 'name'
      setInfo(agentId, { ...getInfo(agentId), jsAttributes: { eventType: 'BetterPageAction', timestamp: 'BetterTimestamp' } })
      genericEventsAgg.ee.emit('api-addPageAction', [relativeTimestamp, name, {}])
      expect(genericEventsAgg.events.buffer[0]).toMatchObject({
        eventType: 'PageAction',
        timestamp: expect.any(Number)
      })
    })

    it('should not record page actions if disabled', async () => {
      const relativeTimestamp = Math.random() * 1000
      const name = 'name'
      getConfiguration(agentId).page_action = { enabled: false }
      const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')
      genericEventsAgg = new Aggregate(agentId, new Aggregator({ agentIdentifier: agentId, ee }))
      genericEventsAgg.ee.emit('api-addPageAction', [relativeTimestamp, name, {}])
      expect(genericEventsAgg.events[0]).toBeUndefined()
    })
  })
})

function wait (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}
