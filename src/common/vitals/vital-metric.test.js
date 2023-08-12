import { VitalMetric } from './vital-metric'

let vitalMetric
beforeEach(() => {
  vitalMetric = new VitalMetric('test')
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('vital-metric', () => {
  test('default values', () => {
    expect(vitalMetric).toMatchObject({
      name: 'test',
      attrs: {},
      entries: undefined
    })

    expect(vitalMetric.value).toMatchObject({
      name: 'test',
      attrs: {},
      entries: undefined,
      previous: undefined,
      current: undefined
    })
  })

  test('update', () => {
    let i = 0
    vitalMetric.update({ value: i, entries: [{ test: i + 1 }], attrs: { test: i + 2 }, addConnectionAttributes: true })
    expect(vitalMetric.value).toMatchObject({
      previous: undefined,
      current: i,
      entries: [{ test: i + 1 }],
      attrs: { test: i + 2 }
    })

    i++
    vitalMetric.update({ value: i, entries: [{ test: i + 1 }], attrs: { test: i + 2 }, addConnectionAttributes: true })
    expect(vitalMetric.value).toMatchObject({
      previous: i - 1,
      current: i,
      entries: [{ test: i + 1 }],
      attrs: { test: i + 2 }
    })
  })

  test('rounding', () => {
    // default rounding
    vitalMetric.update({ value: 1.234 })
    expect(vitalMetric.value.current).toEqual(1)
    // custom rounding
    vitalMetric = new VitalMetric('test', (x) => x * 100)
    vitalMetric.update({ value: 5 })
    expect(vitalMetric.value.current).toEqual(500)
  })

  test('isValid', () => {
    expect(vitalMetric.isValid).toEqual(false)

    vitalMetric.update({ value: -1 })
    expect(vitalMetric.isValid).toEqual(false)

    vitalMetric.update({ value: 1 })
    expect(vitalMetric.isValid).toEqual(true)
  })

  test('subscribers get updates when valid', (done) => {
    vitalMetric.subscribe(({ current: value }) => {
      expect(value).toEqual(1)
      done()
    })

    vitalMetric.update({ value: 1 })
  })

  test('subscribers do not get updates when not valid', (done) => {
    vitalMetric.subscribe(({ current: value }) => {
      fail('should not have reached subscriber')
    })

    vitalMetric.update({ value: -1 })
    setTimeout(done, 1000)
  })

  test('subscribers get latest value immediately if already valid', (done) => {
    vitalMetric.update({ value: 1 })

    vitalMetric.subscribe(({ current: value }) => {
      expect(value).toEqual(1)
      done()
    })
  })

  test('unsubscribe', (done) => {
    const unsubscribe = vitalMetric.subscribe(({ current: value }) => {
      fail('should not have reached subscriber')
    })

    unsubscribe()
    vitalMetric.update({ value: 1 })
    setTimeout(done, 1000)
  })

  test('addConnectionAttributes', () => {
    global.navigator.connection = {}
    vitalMetric.update({ value: 1, addConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({}))

    global.navigator.connection.type = 'type'
    vitalMetric.update({ value: 1, addConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type'
    }))

    global.navigator.connection.effectiveType = 'effectiveType'
    vitalMetric.update({ value: 1, addConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType'
    }))

    global.navigator.connection.rtt = 'rtt'
    vitalMetric.update({ value: 1, addConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt'
    }))

    global.navigator.connection.downlink = 'downlink'
    vitalMetric.update({ value: 1, addConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt',
      'net-dlink': 'downlink'
    }))

    global.navigator.connection = {
      type: 'type',
      effectiveType: 'effectiveType',
      rtt: 'rtt',
      downlink: 'downlink'
    }
    vitalMetric.update({ value: 1, addConnectionAttributes: true })

    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt',
      'net-dlink': 'downlink'
    }))
    global.navigator.connection = {}
  })
})
