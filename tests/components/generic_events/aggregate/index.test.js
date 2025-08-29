import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import { resetAgent, setupAgent } from '../../setup-agent'

const referrerUrl = 'https://test.com'
Object.defineProperty(global.document, 'referrer', { value: referrerUrl, configurable: true })

let mainAgent, genericEventsAggregate

beforeAll(() => {
  mainAgent = setupAgent({
    init: {
      feature_flags: ['user_frustrations']
    }
  })
})

beforeEach(async () => {
  const genericEventsInstrument = new GenericEvents(mainAgent)
  await genericEventsInstrument.onAggregateImported
  genericEventsAggregate = genericEventsInstrument.featAggregate
})

afterEach(() => {
  jest.clearAllMocks()
  resetAgent(mainAgent.agentIdentifier)
})

test('should use default values', () => {
  expect(genericEventsAggregate).toMatchObject({
    referrerUrl: 'https://test.com'
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

test('should harvest early if will exceed 1mb', async () => {
  const triggerHarvestSpy = jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => {})
  expect(triggerHarvestSpy).toHaveBeenCalledTimes(0)
  genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
  await new Promise(process.nextTick)
  expect(triggerHarvestSpy).toHaveBeenCalledTimes(1)

  genericEventsAggregate.addEvent({ name: 'test', eventType: 'x'.repeat(15000) })

  expect(triggerHarvestSpy).toHaveBeenCalledTimes(1)
  genericEventsAggregate.addEvent({ name: 1000, eventType: 'x'.repeat(100000) })
  expect(triggerHarvestSpy).toHaveBeenCalledTimes(2)
  triggerHarvestSpy.mockRestore()
})

test('should not harvest if single event will exceed 1mb', async () => {
  genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
  await new Promise(process.nextTick)
  const triggerHarvestSpy = jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => {})

  genericEventsAggregate.addEvent({ name: 'test', eventType: 'x'.repeat(1000000) })

  expect(triggerHarvestSpy).toHaveBeenCalledTimes(0)
  triggerHarvestSpy.mockRestore()
})

describe('sub-features', () => {
  beforeEach(async () => {
    genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
    await new Promise(process.nextTick)
  })

  test('should record page actions if not disabled', () => {
    const relativeTimestamp = Math.random() * 1000
    const name = 'name'

    const timeKeeper = mainAgent.runtime.timeKeeper
    mainAgent.info.jsAttributes = { globalFoo: 'globalBar' }

    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, { foo: 'bar' }])

    expect(genericEventsAggregate.events.get()[0].data[0]).toMatchObject({
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

    expect(genericEventsAggregate.events.get()[0].data[0]).toMatchObject({
      eventType: 'PageAction',
      timestamp: expect.any(Number)
    })
  })

  test('agent level custom attrs should not override protected attributes', () => {
    const relativeTimestamp = Math.random() * 1000
    const name = 'name'

    mainAgent.info.jsAttributes = { eventType: 'BetterPageAction', timestamp: 'BetterTimestamp' }

    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, {}])

    expect(genericEventsAggregate.events.get()[0].data[0]).toMatchObject({
      eventType: 'PageAction',
      timestamp: expect.any(Number)
    })
  })

  test('should not record page actions if disabled', async () => {
    const relativeTimestamp = Math.random() * 1000
    const name = 'name'

    mainAgent.init.page_action = { enabled: false }

    const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')
    genericEventsAggregate = new Aggregate(mainAgent)
    genericEventsAggregate.ee.emit('api-addPageAction', [relativeTimestamp, name, {}])
    expect(genericEventsAggregate.events?.[0]).toBeUndefined()
  })

  test('should record user actions when enabled', () => {
    mainAgent.info.jsAttributes = { globalFoo: 'globalBar' }
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 123456, type: 'click', target }])
    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])

    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
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
    mainAgent.info.jsAttributes = { globalFoo: 'globalBar' }
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

    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
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
    mainAgent.info.jsAttributes = { globalFoo: 'globalBar' }
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

    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
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
  })

  test('should record marks when enabled', async () => {
    mainAgent.init.performance.capture_marks = true
    mainAgent.info.jsAttributes = { globalFoo: 'globalBar' }
    const origGlobalPO = global.PerformanceObserver
    global.PerformanceObserver = jest.fn(cb => ({
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

    global.PerformanceObserver.supportedEntryTypes = ['mark']

    const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')
    genericEventsAggregate = new Aggregate(mainAgent)
    expect(genericEventsAggregate.events?.[0]).toBeUndefined()

    // temporarily swap out triggerHarvestFor so the buffer doesn't get emptied before we can check
    const triggerHarvestSpy = jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => {})

    genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
    await new Promise(process.nextTick)

    expect(genericEventsAggregate.events.get()[0].data[0]).toMatchObject({
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'test',
      entryDuration: 0,
      entryType: 'mark',
      entryDetail: JSON.stringify({ foo: 'bar' })
    })

    triggerHarvestSpy.mockRestore()
    global.PerformanceObserver = origGlobalPO
  })

  test('should record measures when enabled', async () => {
    mainAgent.init.performance = { capture_measures: true, capture_detail: true, resources: { enabled: false, asset_types: [], first_party_domains: [], ignore_newrelic: true } }
    mainAgent.info.jsAttributes = { globalFoo: 'globalBar' }
    const origGlobalPO = global.PerformanceObserver
    global.PerformanceObserver = jest.fn(cb => ({
      observe: () => {
        const callCb = () => {
          // eslint-disable-next-line
          cb({getEntries: () => [{
            name: 'test',
            duration: 10,
            detail: { foo: 'bar' },
            startTime: performance.now()
          }]
          })
        }
        callCb()
      },
      disconnect: jest.fn()
    }))

    global.PerformanceObserver.supportedEntryTypes = ['measure']

    const { Aggregate } = await import('../../../../src/features/generic_events/aggregate')
    genericEventsAggregate = new Aggregate(mainAgent)
    expect(genericEventsAggregate.events?.[0]).toBeUndefined()

    // temporarily swap out triggerHarvestFor so the buffer doesn't get emptied before we can check
    const triggerHarvestSpy = jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => {})

    genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
    await new Promise(process.nextTick)

    expect(genericEventsAggregate.events.get()[0].data[0]).toMatchObject({
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'test',
      entryDuration: 10,
      entryType: 'measure',
      'entryDetail.foo': 'bar'
    })

    triggerHarvestSpy.mockRestore()
    global.PerformanceObserver = origGlobalPO
  })
})

describe('user frustrations', () => {
  beforeEach(async () => {
    genericEventsAggregate.ee.emit('rumresp', [{ ins: 1 }])
    jest.useFakeTimers()
    jest.advanceTimersByTime(1)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  const genDefaultUserAction = () => {
    return {
      eventType: 'UserAction',
      timestamp: expect.any(Number),
      action: 'click',
      actionCount: 1,
      targetId: 'myBtn',
      targetTag: 'BUTTON'
    }
  }

  const createExpectedObject = (expectedValues) => {
    return Object.assign(genDefaultUserAction(), expectedValues)
  }

  test('should mark as dead click if no change occurs within 2 seconds of user action', () => {
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])

    jest.advanceTimersByTime(2000)
    genericEventsAggregate.ee.emit('xhr', [{ host: 'example.com' }])

    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 2102, type: 'blur', target: window }])
    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject(createExpectedObject({
      deadClick: true
    }))
  })

  test('should not mark as dead click if another action occurs before frustration eval window ends', () => {
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])

    jest.advanceTimersByTime(1999)

    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 2102, type: 'blur', target: window }])
    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject(genDefaultUserAction())
    expect(harvest.body.ins[0].deadClick).toBeUndefined()
  })

  test('should not mark as dead click if non-agent network request occurs within 2 seconds of user action', () => {
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])
    jest.advanceTimersByTime(1999)
    genericEventsAggregate.ee.emit('xhr', [{ host: 'example.com' }])
    jest.advanceTimersByTime(1)

    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])
    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject(genDefaultUserAction())
    expect(harvest.body.ins[0].deadClick).toBeUndefined()
  })

  test('should mark as dead click if no non-agent network request occurred within 2 seconds of user action', () => {
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])
    jest.advanceTimersByTime(1999)
    genericEventsAggregate.ee.emit('xhr', [{ host: 'bam.nr-data.net' }])
    jest.advanceTimersByTime(1)

    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])
    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject(createExpectedObject({
      deadClick: true
    }))
  })

  test('should not mark as error click if no error occurs within 2 seconds of user action', () => {
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])
    jest.advanceTimersByTime(2000)
    genericEventsAggregate.ee.emit('err')

    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])
    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject(genDefaultUserAction())
    expect(harvest.body.ins[0].errorClick).toBeUndefined()
  })

  test('should mark as error click if an error occurs within 2 seconds of user action', () => {
    const target = document.createElement('button')
    target.id = 'myBtn'
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 100, type: 'click', target }])
    jest.advanceTimersByTime(1999)
    genericEventsAggregate.ee.emit('err')
    jest.advanceTimersByTime(1)

    // blur event to trigger aggregation to stop and add to harvest buffer
    genericEventsAggregate.ee.emit('ua', [{ timeStamp: 234567, type: 'blur', target: window }])
    const [{ payload: harvest }] = genericEventsAggregate.makeHarvestPayload() // force it to put the aggregation into the event buffer
    expect(harvest.body.ins[0]).toMatchObject(genDefaultUserAction(), {
      errorClick: true
    })
  })
})
