import test from '../../tools/jil/browser-test'
import { setup } from './utils/setup'
import { Aggregate as MetricsAggreg } from '../../src/features/metrics/aggregate/index'
import * as constants from '../../src/features/metrics/constants'

const metricName = 'test'
const sLabel = constants.SUPPORTABILITY_METRIC
const cLabel = constants.CUSTOM_METRIC

const { aggregator: agg, agentIdentifier } = setup()
const metricsAggreg = new MetricsAggreg(agentIdentifier, agg)

function sum_sq (array) {
  let sum = 0
  let i = array.length
  while (i--) sum += Math.pow(array[i], 2)
  return sum
}

const createAndStoreMetric = (value, isSupportability = true) => {
  const method = isSupportability ? (...args) => metricsAggreg.storeSupportabilityMetrics(...args) : (...args) => metricsAggreg.storeEventMetrics(...args)
  method(metricName, value)
}

// ~~~~~~~~~~~~~~~~~~~~~~~ RECORD SUPPORTABILITY METRIC ~~~~~~~~~~~~~~~~~~~~~~~~~`

test('recordSupportability with no value creates a metric with just a count', function (t) {
  createAndStoreMetric()
  const record = agg.take([sLabel])[sLabel].find(x => x?.params?.name === metricName)
  t.ok(record, 'An aggregated record exists')
  t.ok(record.stats && record.stats.c === 1, 'Props has singular c metric')
  t.end()
})

test('recordSupportability with no value increments multiple times correctly', function (t) {
  createAndStoreMetric()
  createAndStoreMetric()
  createAndStoreMetric()

  const [record] = agg.take([sLabel])[sLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')
  t.ok(record.stats && record.stats.c === 3, 'Props has c metric and it should have incremented thrice')
  t.end()
})

test('recordSupportability with a value aggregates stats section', function (t) {
  createAndStoreMetric(500)
  const [record] = agg.take([sLabel])[sLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')
  t.ok(record.stats && record.stats.t === 500, 'Props has t metric -- 500')
  t.end()
})

test('recordSupportability with a value aggregates stats section and increments correctly', function (t) {
  const values = [Math.random(), Math.random(), Math.random()]
  values.forEach(v => createAndStoreMetric(v))

  const [record] = agg.take([sLabel])[sLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')

  const { stats } = record
  t.ok(stats.t === values.reduce((curr, next) => curr + next, 0), 'aggregated totals sum correctly')
  t.ok(stats.min === Math.min(...values), 'min value is as expected')
  t.ok(stats.max === Math.max(...values), 'max value is as expected')
  t.ok(stats.sos.toFixed(6) === sum_sq(values).toFixed(6), 'sos value is as expected')
  t.ok(stats.c === values.length, 'c value is as expected')
  t.end()
})

test('recordSupportability does not create a customMetric (cm) item', function (t) {
  createAndStoreMetric(Math.random())
  try {
    const record = agg.take([cLabel])[cLabel]
    t.ok(record, JSON.stringify(record))
    t.fail('Should not have found a record in aggregator in wrong tag (cm)... but did')
  } catch (err) {
    agg.take([sLabel])
    t.end()
  }
})

// ~~~~~~~~~~~~~~~~~~~~~~~ RECORD CUSTOM METRIC ~~~~~~~~~~~~~~~~~~~~~~~~~`

test('recordCustom with no value creates a metric with just a count', function (t) {
  createAndStoreMetric(undefined, false)
  const [record] = agg.take([cLabel])[cLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')
  t.ok(record, JSON.stringify(record))
  t.ok(record.metrics && Object.keys(record.metrics).length === 1 && record.metrics.count === 1, 'Props only has count metric and it should have incremented once')
  t.end()
})

test('recordCustom with no value increments multiple times correctly', function (t) {
  createAndStoreMetric(undefined, false)
  createAndStoreMetric(undefined, false)
  createAndStoreMetric(undefined, false)

  const [record] = agg.take([cLabel])[cLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')
  t.ok(record.metrics && Object.keys(record.metrics).length === 1 && record.metrics.count === 3, 'Props only has count metric and it should have incremented thrice')
  t.end()
})

test('recordCustom with a value creates a named metric object in metrics section', function (t) {
  createAndStoreMetric({ time: 500 }, false)
  const [record] = agg.take([cLabel])[cLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')
  t.ok(record.metrics && Object.keys(record.metrics).length > 1 && record.metrics.count === 1, 'it should have incremented once')
  t.ok(record.metrics.time && record.metrics.time.t === 500)
  t.end()
})

test('recordCustom with a value creates a named metric object in metrics section and increments correctly', function (t) {
  const values = [Math.random(), Math.random(), Math.random()]
  values.forEach(v => createAndStoreMetric({ time: v }, false))

  const [record] = agg.take([cLabel])[cLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')
  t.ok(record.metrics && Object.keys(record.metrics).length > 1 && record.metrics.count === 3, 'it should have incremented once')
  const { time } = record.metrics
  t.ok(!!time, 'named metric exists')
  t.ok(time.t === values.reduce((curr, next) => curr + next, 0), 'aggregated totals sum correctly')
  t.ok(time.min === Math.min(...values), 'min value is as expected')
  t.ok(time.max === Math.max(...values), 'max value is as expected')
  t.ok(time.sos.toFixed(6) === sum_sq(values).toFixed(6), 'sos value is as expected')
  t.ok(time.c === values.length, 'c value is as expected')
  t.end()
})

test('recordCustom with an invalid value type does not create a named metric object in metrics section', function (t) {
  createAndStoreMetric(Math.random(), false)
  const [record] = agg.take([cLabel])[cLabel]
  t.ok(record, 'An aggregated record exists')
  t.equals(record.params.name, metricName, 'Name is correct')
  t.ok(record.metrics && Object.keys(record.metrics).length === 1 && record.metrics.count === 1, 'Props only has count metric and it should have incremented once')
  t.end()
})

test('recordCustom does not create a supportabilityMetric (sm) item', function (t) {
  createAndStoreMetric(Math.random(), false)
  try {
    const record = agg.take([sLabel])[sLabel]
    t.ok(record, JSON.stringify(record))
    t.fail('Should not have found a record in aggreator in wrong tag (sm)... but did')
  } catch (err) {
    agg.take([cLabel])
    t.end()
  }
})
