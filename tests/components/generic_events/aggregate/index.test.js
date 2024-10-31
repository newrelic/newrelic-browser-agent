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
  const genericEventsInstrument = new GenericEvents(agentSetup)
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

describe('sub-features', () => {
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
    genericEventsAggregate = new Aggregate(agentSetup)
    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, {}])
    expect(genericEventsAggregate.events[0]).toBeUndefined()
  })

  test('should record user actions when enabled', () => {
    agentSetup.info.jsAttributes = { globalFoo: 'globalBar' }
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 123456, type: 'click', target }])
    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])

    const harvest = genericEventsAggregate.onHarvestStarted({ isFinalHarvest: true }) // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject({
      eventType: 'UserAction',
      timestamp: expect.any(Number),
      action: 'click',
      actionCount: 1,
      actionDuration: 0,
      target: 'button#myBtn:nth-of-type(1)',
      targetId: 'myBtn',
      targetTag: 'BUTTON',
      globalFoo: 'globalBar'
    })
  })

  test('should aggregate user actions when matching target', () => {
    getInfo(agentSetup.agentIdentifier).jsAttributes = { globalFoo: 'globalBar' }
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 200, type: 'click', target }])
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 300, type: 'click', target }])
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 400, type: 'click', target }])
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 500, type: 'click', target }])
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 600, type: 'click', target }])
    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])

    const harvest = genericEventsAggregate.onHarvestStarted({ isFinalHarvest: true }) // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject({
      eventType: 'UserAction',
      timestamp: expect.any(Number),
      action: 'click',
      actionCount: 6,
      actionDuration: 500,
      target: 'button#myBtn:nth-of-type(1)',
      targetId: 'myBtn',
      targetTag: 'BUTTON',
      globalFoo: 'globalBar'
    })
  })
  test('should NOT aggregate user actions when targets are not identical', () => {
    getInfo(agentSetup.agentIdentifier).jsAttributes = { globalFoo: 'globalBar' }
    const target = document.createElement('button')
    target.id = 'myBtn'
    document.body.appendChild(target)
    const target2 = document.createElement('button')
    target2.id = 'myBtn'
    document.body.appendChild(target2)
    /** even though target1 and target2 have the same tag (button) and id (myBtn), it should still NOT aggregate them because they have different nth-of-type paths */
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 200, type: 'click', target: target2 }])
    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])

    const harvest = genericEventsAggregate.onHarvestStarted({ isFinalHarvest: true }) // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject({
      eventType: 'UserAction',
      timestamp: expect.any(Number),
      action: 'click',
      actionCount: 1,
      actionDuration: 0,
      target: 'html>body>button#myBtn:nth-of-type(1)',
      targetId: 'myBtn',
      targetTag: 'BUTTON',
      globalFoo: 'globalBar'
    })
    expect(harvest.body.ins[1]).toMatchObject({
      eventType: 'UserAction',
      timestamp: expect.any(Number),
      action: 'click',
      actionCount: 1,
      actionDuration: 0,
      target: 'html>body>button#myBtn:nth-of-type(2)',
      targetId: 'myBtn',
      targetTag: 'BUTTON',
      globalFoo: 'globalBar'
    })
  })

  test('should record marks when enabled', async () => {
    agentSetup.init.performance.capture_marks = true
    agentSetup.info.jsAttributes = { globalFoo: 'globalBar' }
    const mockPerformanceObserver = jest.fn(cb => ({
      observe: () => {
        const callCb = () => {
          // eslint-disable-next-line
          cb({getEntries: () => [{ 
            name: 'test',
            duration: 0,
            detail: JSON.stringify({ foo: 'bar' }),
            startTime: performance.now()
          }]
          })
        }
        callCb()
      },
      disconnect: jest.fn()
    }))

    global.PerformanceObserver = mockPerformanceObserver
    global.PerformanceObserver.supportedEntryTypes = ['mark']

    const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')
    genericEventsAggregate = new Aggregate(agentSetup)
    expect(genericEventsAggregate.events[0]).toBeUndefined()

    genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
    await new Promise(process.nextTick)

    expect(genericEventsAggregate.events.buffer[0]).toMatchObject({
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'test',
      entryDuration: 0,
      entryType: 'mark',
      entryDetail: JSON.stringify({ foo: 'bar' })
    })
  })

  test('should record measures when enabled', async () => {
    agentSetup.init.performance = { capture_measures: true }
    getInfo(agentSetup.agentIdentifier).jsAttributes = { globalFoo: 'globalBar' }
    const mockPerformanceObserver = jest.fn(cb => ({
      observe: () => {
        const callCb = () => {
          // eslint-disable-next-line
          cb({getEntries: () => [{
            name: 'test',
            duration: 10,
            detail: JSON.stringify({ foo: 'bar' }),
            startTime: performance.now()
          }]
          })
        }
        callCb()
      },
      disconnect: jest.fn()
    }))

    global.PerformanceObserver = mockPerformanceObserver
    global.PerformanceObserver.supportedEntryTypes = ['measure']

    const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')
    genericEventsAggregate = new Aggregate(agentSetup)
    expect(genericEventsAggregate.events[0]).toBeUndefined()

    genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
    await new Promise(process.nextTick)

    expect(genericEventsAggregate.events.buffer[0]).toMatchObject({
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'test',
      entryDuration: 10,
      entryType: 'measure',
      entryDetail: JSON.stringify({ foo: 'bar' })
    })
  })
})
