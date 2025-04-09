import { SUPPORTABILITY_METRIC, CUSTOM_METRIC } from '../../../src/features/metrics/constants'
import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as Metrics } from '../../../src/features/metrics/instrument'
import { faker } from '@faker-js/faker'
import { EventAggregator } from '../../../src/common/aggregate/event-aggregator'

let mainAgent

beforeAll(async () => {
  mainAgent = setupAgent({}, EventAggregator)
})

let metricsAggregate, metricName

beforeEach(async () => {
  const metricsInstrument = new Metrics(mainAgent)
  await new Promise(process.nextTick)
  metricsAggregate = metricsInstrument.featAggregate

  metricName = faker.string.uuid()
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
})

;[
  ['storeSupportability', SUPPORTABILITY_METRIC, true, 'aggregates stats section'],
  ['storeEvent (custom)', CUSTOM_METRIC, false, 'creates a named metric object in metrics section']
].forEach(([name, type, isSupportability, auxDescription]) => {
  test(`${name} with no value creates a metric with just a count`, () => {
    createAndStoreMetric(undefined, isSupportability)

    const records = metricsAggregate.events.get({ aggregatorTypes: [type] })[0].data[type]
      .filter(x => x?.params?.name === metricName)
    expect(records.length).toEqual(1)

    if (isSupportability) {
      expect(records[0].stats?.c).toEqual(1)
    } else {
      expect(Object.keys(records[0].metrics).length).toEqual(1)
      expect(records[0].metrics.count).toEqual(1)
    }
  })

  test(`${name} with no value increments multiple times correctly`, () => {
    createAndStoreMetric(undefined, isSupportability)
    createAndStoreMetric(undefined, isSupportability)
    createAndStoreMetric(undefined, isSupportability)

    const records = metricsAggregate.events.get({ aggregatorTypes: [type] })[0].data[type]
      .filter(x => x?.params?.name === metricName)
    expect(records.length).toEqual(1)

    if (isSupportability) {
      expect(records[0].stats?.c).toEqual(3)
    } else {
      expect(Object.keys(records[0].metrics).length).toEqual(1)
      expect(records[0].metrics.count).toEqual(3)
    }
  })

  test(`${name} with a value ${auxDescription}`, () => {
    createAndStoreMetric(isSupportability ? 500 : { time: 500 }, isSupportability)

    const records = metricsAggregate.events.get({ aggregatorTypes: [type] })[0].data[type]
      .filter(x => x?.params?.name === metricName)
    expect(records.length).toEqual(1)

    if (isSupportability) {
      expect(records[0].stats?.t).toEqual(500)
    } else {
      expect(Object.keys(records[0].metrics).length).toBeGreaterThan(1)
      expect(records[0].metrics.count).toEqual(1)
      expect(records[0].metrics.time?.t).toEqual(500)
    }
  })

  test(`${name} with a value ${auxDescription} and increments correctly`, () => {
    const values = new Array(faker.number.int({ min: 100, max: 1000 }))
      .fill(null).map(() => faker.number.int({ min: 100, max: 1000 }))
    values.forEach(v => createAndStoreMetric(isSupportability ? v : { time: v }, isSupportability))

    const records = metricsAggregate.events.get({ aggregatorTypes: [type] })[0].data[type]
      .filter(x => x?.params?.name === metricName)
    expect(records.length).toEqual(1)

    let props
    if (isSupportability) props = records[0].stats
    else props = records[0].metrics.time

    expect(props.t).toEqual(values.reduce((curr, next) => curr + next, 0))
    expect(props.min).toEqual(Math.min(...values))
    expect(props.max).toEqual(Math.max(...values))
    expect(props.sos.toFixed(6)).toEqual(sum_sq(values).toFixed(6))
    expect(props.c).toEqual(values.length)
  })

  const otherType = name === 'storeSupportability' ? CUSTOM_METRIC : SUPPORTABILITY_METRIC
  test(`${name} does not create a ${otherType} item`, () => {
    createAndStoreMetric(faker.number.float(), isSupportability)

    const records = metricsAggregate.events.get([otherType])?.[otherType]
      ?.filter(x => x?.params?.name === metricName) || []
    expect(records).toEqual([])
  })

  if (!isSupportability) { // additional test for custom metric
    test('storeEvent (custom) with an invalid value type does not create a named metric object in metrics section', () => {
      createAndStoreMetric(faker.number.float(), false)

      const records = metricsAggregate.events.get({ aggregatorTypes: [CUSTOM_METRIC] })[0].data[CUSTOM_METRIC]
        .filter(x => x?.params?.name === metricName)
      expect(records.length).toEqual(1)

      expect(Object.keys(records[0].metrics).length).toEqual(1)
      expect(records[0].metrics.count).toEqual(1)
    })
  }
})

test('Metrics does not harvest on interval, only on EoL', () => {
  createAndStoreMetric(undefined, true)
  expect(metricsAggregate.events.isEmpty(metricsAggregate.harvestOpts)).toEqual(false) // double check so that harvest should proceed
  metricsAggregate.drained = true // this is a requisite for harvest in preHarvestChecks

  expect(mainAgent.runtime.harvester.triggerHarvestFor(metricsAggregate)).toEqual(false) // mimics what the harveseter does on interval
  expect(mainAgent.runtime.harvester.triggerHarvestFor(metricsAggregate, { isFinalHarvest: true })).toEqual(true) // mimics what the harveseter does on EoL
})

function createAndStoreMetric (value, isSupportability) {
  const method = isSupportability ? (...args) => metricsAggregate.storeSupportabilityMetrics(...args) : (...args) => metricsAggregate.storeEventMetrics(...args)
  method(metricName, value)
}

function sum_sq (array) {
  let sum = 0
  let i = array.length
  while (i--) sum += Math.pow(array[i], 2)
  return sum
}
