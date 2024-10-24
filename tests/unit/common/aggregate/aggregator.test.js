import { Aggregator } from '../../../../src/common/aggregate/aggregator.js'

let aggregator
beforeEach(() => {
  aggregator = new Aggregator()
})

test('storing and getting buckets', () => {
  let bucket = aggregator.store('abc', '123')
  const expectedBucketPattern = { params: {}, metrics: { count: 1 } }
  expect(bucket).toEqual(expectedBucketPattern)
  expect(aggregator.aggregatedData.abc['123']).toEqual(expectedBucketPattern)

  aggregator.store('abc', '456')
  // check we can get all buckets under the same type
  expect(aggregator.aggregatedData.abc).toEqual({ 123: expectedBucketPattern, 456: expectedBucketPattern })
})

describe('storing the same bucket again', () => {
  test('increments the count', () => {
    aggregator.store('abc', '123')
    aggregator.store('abc', '123')
    expect(aggregator.aggregatedData.abc['123']).toEqual({ params: {}, metrics: { count: 2 } })
  })

  test('does not overwrite params', () => {
    aggregator.store('def', '123', { someParam: true })
    aggregator.store('def', '123', { anotherParam: true })
    expect(aggregator.aggregatedData.def['123']).toEqual({ params: { someParam: true }, metrics: { count: 2 } })
  })

  test('does not overwrite custom params either', () => {
    aggregator.store('ghi', '123', undefined, undefined, { someCustomParam: true })
    aggregator.store('ghi', '123', undefined, undefined, { someCustomParam: false })
    expect(aggregator.aggregatedData.ghi['123']).toEqual({ params: {}, custom: { someCustomParam: true }, metrics: { count: 2 } })
  })
})

describe('metrics are properly updated', () => {
  test('when using store fn', () => {
    const expectedBucketPattern = {
      params: {},
      metrics: {
        count: 2,
        met1: { t: 3, min: 1, max: 2, sos: 5, c: 2 },
        met2: { t: 7, min: 3, max: 4, sos: 25, c: 2 }
      }
    }
    aggregator.store('abc', '123', undefined, { met1: 1, met2: 3 })
    aggregator.store('abc', '123', undefined, { met1: 2, met2: 4 })
    expect(aggregator.aggregatedData.abc['123']).toEqual(expectedBucketPattern)
  })

  test('when using storeMetric fn', () => {
    const expectedBucketPattern = {
      params: {},
      stats: { t: 6, min: 1, max: 3, sos: 14, c: 3 }
    }
    aggregator.storeMetric('abc', 'metric', undefined, 2)
    aggregator.storeMetric('abc', 'metric', undefined, 1)
    aggregator.storeMetric('abc', 'metric', undefined, 3)
    expect(aggregator.aggregatedData.abc.metric).toEqual(expectedBucketPattern)
  })

  test('when using merge fn', () => {
    const expectedBucketPattern = {
      params: { other: 'blah' },
      metrics: {
        count: 5,
        met1: { t: 8, min: 1, max: 6, sos: 35, c: 4 },
        met2: { t: 14, min: 3, max: 7, sos: 74, c: 3 }
      }
    }
    aggregator.store('abc', 'metric', { other: 'blah' }, { met1: 1, met2: 3 })
    aggregator.merge('abc', 'metric', { count: 2, met1: { t: 2 }, met2: { t: 4 } })
    aggregator.merge('abc', 'metric', { count: 2, met1: { t: 5, min: 3, max: 6, c: 2, sos: 30 }, met2: { t: 7 } })
    expect(aggregator.aggregatedData.abc.metric).toEqual(expectedBucketPattern)
  })
})

test('take fn gets and deletes correctly', () => {
  aggregator.store('type1', 'a')
  aggregator.store('type1', 'b')
  aggregator.store('type2', 'a')
  aggregator.store('type3', 'a')

  expect(aggregator.take(['type0'])).toBeNull() // when type dne in aggregator
  let obj = aggregator.take(['type1', 'type2'])
  expect(obj.type1.length).toEqual(2)
  expect(obj.type2.length).toEqual(1)
  expect(aggregator.aggregatedData.type1?.a).toBeUndefined() // should be gone now
  expect(aggregator.aggregatedData.type3?.a).toEqual(expect.any(Object))
})

test('merge fn combines metrics correctly', () => {
  aggregator.store('abc', '123', undefined, { met1: 1, met2: 3 })
  let bucket = aggregator.store('abc', '123', undefined, { met1: 2 })
  const expectedMetrics = {
    count: 2,
    met1: { t: 3, min: 1, max: 2, sos: 5, c: 2 },
    met2: { t: 3 }
  }
  expect(bucket.metrics).toEqual(expectedMetrics)

  aggregator.merge('abc', '456', bucket.metrics)
  expect(aggregator.aggregatedData.abc['456'].metrics).toEqual(expectedMetrics)

  aggregator.merge('abc', '123', {
    count: 4,
    met1: { t: 4, min: 0, max: 4, sos: 16, c: 2 },
    met2: { t: 5 },
    met3: { t: 6 },
    met4: { t: 7, min: 3, max: 4, sos: 25, c: 2 }
  })
  expect(aggregator.aggregatedData.abc['123'].metrics).toEqual({
    count: 6,
    met1: { t: 7, min: 0, max: 4, sos: 21, c: 4 },
    met2: { t: 8, min: 3, max: 5, sos: 34, c: 2 },
    met3: { t: 6 },
    met4: { t: 7, min: 3, max: 4, sos: 25, c: 2 }
  })
})
