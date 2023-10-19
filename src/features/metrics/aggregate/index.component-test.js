
import { Aggregator } from '../../../common/aggregate/aggregator'
import { Aggregate } from '.'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { SUPPORTABILITY_METRIC, CUSTOM_METRIC } from '../constants'

const METRIC_NAME = 'test'
const agg = new Aggregator({ agentIdentifier: 'abcd', ee })
const metricsAggreg = new Aggregate('abcd', agg)

function sum_sq (array) {
  let sum = 0
  let i = array.length
  while (i--) sum += Math.pow(array[i], 2)
  return sum
}
const createAndStoreMetric = (value, isSupportability) => {
  const method = isSupportability ? (...args) => metricsAggreg.storeSupportabilityMetrics(...args) : (...args) => metricsAggreg.storeEventMetrics(...args)
  method(METRIC_NAME, value)
}

jest.mock('../../../common/config/config', () => ({
  __esModule: true,
  isConfigured: jest.fn().mockReturnValue(true),
  getConfigurationValue: jest.fn().mockReturnValue(undefined),
  getConfiguration: jest.fn().mockReturnValue({ proxy: {} }),
  getRuntime: jest.fn().mockReturnValue({})
}))

describe('metrics aggregate test', () => {
  [
    ['storeSupportability', SUPPORTABILITY_METRIC, true, 'aggregates stats section'],
    ['storeEvent (custom)', CUSTOM_METRIC, false, 'creates a named metric object in metrics section']
  ].forEach(([name, type, isSupportability, auxDescription]) => {
    test(`${name} with no value creates a metric with just a count`, () => {
      createAndStoreMetric(undefined, isSupportability)
      const record = agg.take([type])[type].find(x => x?.params?.name === METRIC_NAME)
      expect(record).toBeTruthy()

      if (isSupportability) expect(record.stats?.c).toEqual(1)
      else {
        expect(Object.keys(record.metrics).length).toEqual(1)
        expect(record.metrics.count).toEqual(1)
      }
    })

    test(`${name} with no value increments multiple times correctly`, () => {
      createAndStoreMetric(undefined, isSupportability)
      createAndStoreMetric(undefined, isSupportability)
      createAndStoreMetric(undefined, isSupportability)
      const [record] = agg.take([type])[type]
      expect(record.params.name).toEqual(METRIC_NAME)

      if (isSupportability) expect(record.stats?.c).toEqual(3)
      else {
        expect(Object.keys(record.metrics).length).toEqual(1)
        expect(record.metrics.count).toEqual(3)
      }
    })

    test(`${name} with a value ${auxDescription}`, () => {
      createAndStoreMetric(isSupportability ? 500 : { time: 500 }, isSupportability)
      const [record] = agg.take([type])[type]
      expect(record).toBeTruthy()
      expect(record.params.name).toEqual(METRIC_NAME)

      if (isSupportability) expect(record.stats?.t).toEqual(500)
      else {
        expect(Object.keys(record.metrics).length).toBeGreaterThan(1)
        expect(record.metrics.count).toEqual(1)
        expect(record.metrics.time?.t).toEqual(500)
      }
    })

    test(`${name} with a value ${auxDescription} and increments correctly`, () => {
      const values = [Math.random(), Math.random(), Math.random()]
      values.forEach(v => createAndStoreMetric(isSupportability ? v : { time: v }, isSupportability))

      const [record] = agg.take([type])[type]
      expect(record.params.name).toEqual(METRIC_NAME)

      let prop
      if (isSupportability) prop = record.stats
      else prop = record.metrics.time

      expect(prop.t).toEqual(values.reduce((curr, next) => curr + next, 0))
      expect(prop.min).toEqual(Math.min(...values))
      expect(prop.max).toEqual(Math.max(...values))
      expect(prop.sos.toFixed(6)).toEqual(sum_sq(values).toFixed(6))
      expect(prop.c).toEqual(values.length)
    })

    const otherType = name === 'storeSupportability' ? CUSTOM_METRIC : SUPPORTABILITY_METRIC
    test(`${name} does not create a ${otherType} item`, () => {
      createAndStoreMetric(Math.random(), isSupportability)
      const record = agg.take([otherType])?.[otherType]
      expect(record).toBeUndefined()
      agg.take([type]) // empty the agg bucket for next test(s)
    })

    if (!isSupportability) { // additional test for custom metric
      test('storeEvent (custom) with an invalid value type does not create a named metric object in metrics section', () => {
        createAndStoreMetric(Math.random(), false)
        const [record] = agg.take([CUSTOM_METRIC])[CUSTOM_METRIC]
        expect(record.params.name).toEqual(METRIC_NAME)

        expect(Object.keys(record.metrics).length).toEqual(1)
        expect(record.metrics.count).toEqual(1)
      })
    }
  })
})
