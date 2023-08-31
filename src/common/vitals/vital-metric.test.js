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
      history: []
    })

    expect(vitalMetric.value).toMatchObject({
      name: 'test',
      attrs: {},
      entries: [],
      current: undefined
    })
  })

  test('update', () => {
    let i = 0
    vitalMetric.update({ value: i, entries: [{ test: i + 1 }], attrs: { test: i + 2 }, shouldAddConnectionAttributes: true })
    expect(vitalMetric.value).toMatchObject({
      current: i,
      entries: [{ test: i + 1 }],
      attrs: { test: i + 2 }
    })

    i++
    vitalMetric.update({ value: i, entries: [{ test: i + 1 }], attrs: { test: i + 2 }, shouldAddConnectionAttributes: true })
    expect(vitalMetric.value).toMatchObject({
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

  test('multiple subscribers get same update when valid', (done) => {
    let sub1, sub2
    let stop1 = vitalMetric.subscribe(({ entries }) => {
      sub1 ??= entries[0].id
      if (sub1 === sub2) { stop1(); stop2(); done() }
    })

    let stop2 = vitalMetric.subscribe(({ entries }) => {
      sub2 ??= entries[0].id
      if (sub1 === sub2) { stop1(); stop2(); done() }
    })

    vitalMetric.update({ value: 1, entries: [{ id: 'abcd' }] })
  })

  test('subscribers do not get updates when not valid', (done) => {
    vitalMetric.subscribe(({ current: value }) => {
      console.log(value)
      console.log('should not have reached subscriber')
      expect(1).toEqual(2)
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
      console.log('should not have reached subscriber')
      expect(1).toEqual(2)
    })

    unsubscribe()
    vitalMetric.update({ value: 1 })
    setTimeout(done, 1000)
  })

  test('addConnectionAttributes', () => {
    global.navigator.connection = {}
    vitalMetric.update({ value: 1, shouldAddConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({}))

    global.navigator.connection.type = 'type'
    vitalMetric.update({ value: 1, shouldAddConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type'
    }))

    global.navigator.connection.effectiveType = 'effectiveType'
    vitalMetric.update({ value: 1, shouldAddConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType'
    }))

    global.navigator.connection.rtt = 'rtt'
    vitalMetric.update({ value: 1, shouldAddConnectionAttributes: true })
    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt'
    }))

    global.navigator.connection.downlink = 'downlink'
    vitalMetric.update({ value: 1, shouldAddConnectionAttributes: true })
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
    vitalMetric.update({ value: 1, shouldAddConnectionAttributes: true })

    expect(vitalMetric.value.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt',
      'net-dlink': 'downlink'
    }))
    global.navigator.connection = {}
  })
})
