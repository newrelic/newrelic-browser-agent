import { VitalMetric } from '../../../../src/common/vitals/vital-metric'
import { now } from '../../../../src/common/timing/now'

jest.mock('../../../../src/common/timing/now', () => ({ now: jest.fn() }))

const NOW = 5000

let vitalMetric
beforeEach(() => {
  now.mockReturnValue(NOW)
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

    expect(vitalMetric.current).toMatchObject({
      name: 'test',
      attrs: {},
      value: undefined
    })
  })

  test('update', () => {
    let i = 0
    vitalMetric.update({ value: i, attrs: { test: i + 2 } })
    expect(vitalMetric.current).toMatchObject({
      value: i,
      attrs: { test: i + 2 }
    })

    i++
    vitalMetric.update({ value: i, attrs: { test: i + 2 } })
    expect(vitalMetric.current).toMatchObject({
      value: i,
      attrs: { test: i + 2 }
    })
  })

  test('omits attrs whose value is undefined', () => {
    vitalMetric.update({ value: 1, attrs: { kept: 'yes', alsoKept: 0, dropped: undefined, keptNull: null } })
    expect(vitalMetric.current.attrs).toStrictEqual({ kept: 'yes', alsoKept: 0, keptNull: null })
  })

  describe('relativeTimestamp', () => {
    test.each([
      ['fcp', {}],
      ['lcp', { interactionTime: 123, largestShiftTime: 456 }]
    ])('%s uses its own value, ignoring inp/cls attribution attrs', (name, attrs) => {
      const metric = new VitalMetric(name)
      metric.update({ value: 250, attrs })
      expect(metric.current.relativeTimestamp).toEqual(250)
    })

    test('inp uses attrs.interactionTime rather than its duration value', () => {
      const metric = new VitalMetric('inp')
      metric.update({ value: 250, attrs: { interactionTime: 1234 } })
      expect(metric.current.relativeTimestamp).toEqual(1234)
    })

    test('cls uses attrs.largestShiftTime rather than its unitless score', () => {
      const metric = new VitalMetric('cls')
      metric.update({ value: 0.05, attrs: { largestShiftTime: 4321 } })
      expect(metric.current.relativeTimestamp).toEqual(4321)
    })

    test.each(['inp', 'cls'])('%s falls back to now() when its attribution time is missing', (name) => {
      const metric = new VitalMetric(name)
      metric.update({ value: 0.05, attrs: {} })
      expect(metric.current.relativeTimestamp).toEqual(NOW)
    })

    test.each([
      ['inp', { interactionTime: 0 }],
      ['cls', { largestShiftTime: 0 }]
    ])('%s keeps an attribution time of 0 rather than falling back to now()', (name, attrs) => {
      const metric = new VitalMetric(name)
      metric.update({ value: 0.05, attrs })
      expect(metric.current.relativeTimestamp).toEqual(0)
    })

    test('is captured per update, so history keeps each observation\'s own timestamp', () => {
      const metric = new VitalMetric('cls')
      metric.update({ value: 0.01, attrs: { largestShiftTime: 100 } })
      metric.update({ value: 0.02, attrs: { largestShiftTime: 200 } })
      expect(metric.history.map(h => h.relativeTimestamp)).toEqual([100, 200])
    })
  })

  test('rounding', () => {
    // default rounding
    vitalMetric.update({ value: 1.234 })
    expect(vitalMetric.current.value).toEqual(1)
    // custom rounding
    vitalMetric = new VitalMetric('test', (x) => x * 100)
    vitalMetric.update({ value: 5 })
    expect(vitalMetric.current.value).toEqual(500)
  })

  test('isValid', () => {
    expect(vitalMetric.isValid).toEqual(false)

    vitalMetric.update({ value: -1 })
    expect(vitalMetric.isValid).toEqual(false)

    vitalMetric.update({ value: 1 })
    expect(vitalMetric.isValid).toEqual(true)
  })

  test('subscribers get updates when valid', (done) => {
    vitalMetric.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    })

    vitalMetric.update({ value: 1 })
  })

  test('multiple subscribers get same update when valid', (done) => {
    let witness = 0
    vitalMetric.subscribe(({ value }) => {
      expect(value).toEqual(1)
      witness++
    })
    vitalMetric.subscribe(({ value }) => {
      expect(value).toEqual(1)
      witness++
      if (witness === 2) done()
    })

    vitalMetric.update({ value: 1 })
  })

  test('subscribers do not get updates when not valid', (done) => {
    vitalMetric.subscribe(({ value }) => {
      console.log(value)
      console.log('should not have reached subscriber')
      expect(1).toEqual(2)
    })

    vitalMetric.update({ value: -1 })
    setTimeout(done, 1000)
  })

  test('subscribers get latest value immediately if already valid', (done) => {
    vitalMetric.update({ value: 1 })

    vitalMetric.subscribe(({ value }) => {
      expect(value).toEqual(1)
      done()
    })
  })

  test('unsubscribe', (done) => {
    const unsubscribe = vitalMetric.subscribe(({ value }) => {
      console.log('should not have reached subscriber')
      expect(1).toEqual(2)
    })

    unsubscribe()
    vitalMetric.update({ value: 1 })
    setTimeout(done, 1000)
  })
})
