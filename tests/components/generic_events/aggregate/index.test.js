import { EventBuffer } from '../../../../src/features/utils/event-buffer'
import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import { getInfo } from '../../../../src/common/config/info'
import { resetAgent, setupAgent } from '../../setup-agent'
import { getConfiguration } from '../../../../src/common/config/init'
import { getRuntime } from '../../../../src/common/config/runtime'

const referrerUrl = 'https://test.com'
Object.defineProperty(global.document, 'referrer', { value: referrerUrl, configurable: true })

let agentSetup, genericEventsAggregate

beforeAll(() => {
  agentSetup = setupAgent()
})

beforeEach(async () => {
  const genericEventsInstrument = new GenericEvents(agentSetup.agentIdentifier, { aggregator: agentSetup.aggregator, eventManager: agentSetup.eventManager })
  await new Promise(process.nextTick)
  genericEventsAggregate = genericEventsInstrument.featAggregate
})

afterEach(() => {
  resetAgent(agentSetup.agentIdentifier)
})

test('should use default values', () => {
  expect(genericEventsAggregate).toMatchObject({
    eventsPerHarvest: 1000,
    harvestTimeSeconds: 30,
    referrerUrl: 'https://test.com',
    events: new EventBuffer()
  })
})

test('should wait for flags - 1', async () => {
  expect(genericEventsAggregate.drained).not.toEqual(true)
  genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])

  await new Promise(process.nextTick)

  expect(genericEventsAggregate.drained).toEqual(true)
})

test('should wait for flags - 0', async () => {
  expect(genericEventsAggregate.drained).not.toEqual(true)
  genericEventsAggregate.ee.emit('rumresp', [{ ins: 0 }])

  await new Promise(process.nextTick)

  expect(genericEventsAggregate.blocked).toEqual(true)
})

test('should warn if invalid event is provide', async () => {
  console.debug = jest.fn()
  genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])

  await new Promise(process.nextTick)

  genericEventsAggregate.addEvent({ name: 'test' })
  expect(console.debug).toHaveBeenCalledWith('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#44', undefined)
})

test('should only buffer 64kb of events at a time', async () => {
  genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])

  await new Promise(process.nextTick)

  genericEventsAggregate.harvestScheduler.runHarvest = jest.fn()
  genericEventsAggregate.addEvent({ name: 'test', eventType: 'x'.repeat(63000) })

  expect(genericEventsAggregate.harvestScheduler.runHarvest).not.toHaveBeenCalled()
  genericEventsAggregate.addEvent({ name: 1000, eventType: 'x'.repeat(1000) })
  expect(genericEventsAggregate.harvestScheduler.runHarvest).toHaveBeenCalled()
})

describe('page_actions', () => {
  beforeEach(async () => {
    genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
    await new Promise(process.nextTick)
  })

  test('should record page actions if not disabled', () => {
    const relativeTimestamp = Math.random() * 1000
    const name = 'name'

    const timeKeeper = getRuntime(agentSetup.agentIdentifier).timeKeeper
    getInfo(agentSetup.agentIdentifier).jsAttributes = { globalFoo: 'globalBar' }

    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, { foo: 'bar' }])

    expect(genericEventsAggregate.events.buffer[0]).toMatchObject({
      eventType: 'PageAction',
      timestamp: Math.floor(timeKeeper.correctAbsoluteTimestamp(
        timeKeeper.convertRelativeTimestamp(relativeTimestamp)
      )),
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

  test('event level custom attrs should not override protected attributes', () => {
    const relativeTimestamp = Math.random() * 1000
    const name = 'name'

    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, { eventType: 'BetterPageAction', timestamp: 'BetterTimestamp' }])

    expect(genericEventsAggregate.events.buffer[0]).toMatchObject({
      eventType: 'PageAction',
      timestamp: expect.any(Number)
    })
  })

  test('agent level custom attrs should not override protected attributes', () => {
    const relativeTimestamp = Math.random() * 1000
    const name = 'name'

    getInfo(agentSetup.agentIdentifier).jsAttributes = { eventType: 'BetterPageAction', timestamp: 'BetterTimestamp' }

    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, {}])

    expect(genericEventsAggregate.events.buffer[0]).toMatchObject({
      eventType: 'PageAction',
      timestamp: expect.any(Number)
    })
  })

  test('should not record page actions if disabled', async () => {
    const relativeTimestamp = Math.random() * 1000
    const name = 'name'

    getConfiguration(agentSetup.agentIdentifier).page_action = { enabled: false }

    const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')
    genericEventsAggregate = new Aggregate(agentSetup.agentIdentifier, { aggregator: agentSetup.aggregator, eventManager: agentSetup.eventManager })
    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, {}])
    expect(genericEventsAggregate.events[0]).toBeUndefined()
  })
})
