import { addPT, addPN } from './nav-timing'

const offset = 123
const testValues = {
  unloadEventStart: 1,
  redirectStart: 2,
  unloadEventEnd: 3,
  redirectEnd: 4,
  fetchStart: 5,
  domainLookupStart: 6,
  domainLookupEnd: 7,
  connectStart: 8,
  secureConnectionStart: 9,
  connectEnd: 10,
  requestStart: 11,
  responseStart: 12,
  responseEnd: 13,
  domLoading: 14,
  domInteractive: 15,
  domContentLoadedEventStart: 16,
  domContentLoadedEventEnd: 17,
  domComplete: 18,
  loadEventStart: 19,
  loadEventEnd: 20,
  type: 21,
  redirectCount: 22
}

const expectedPT = {
  of: offset,
  n: 0,
  u: 1,
  r: 2,
  ue: 3,
  re: 4,
  f: 5,
  dn: 6,
  dne: 7,
  c: 8,
  s: 9,
  ce: 10,
  rq: 11,
  rp: 12,
  rpe: 13,
  dl: 14,
  di: 15,
  ds: 16,
  de: 17,
  dc: 18,
  l: 19,
  le: 20
}

const expectedPN = {
  ty: 21,
  rc: 22
}

describe('addPT()', () => {
  test('an output object is populated with valid values', () => {
    const output = addPT(offset, testValues, {})
    expect(output).toEqual(expectedPT)
  })

  test('an object with invalid values is handled', () => {
    const output = addPT(offset, { ...testValues, invalidValue: 'test' }, {})
    expect(output).toEqual(expectedPT)

    const output2 = addPT(offset, { ...testValues, loadEventEnd: -1 }, {})
    let expected = { ...expectedPT }
    delete expected.le
    expect(output2).toEqual(expected)

    const output3 = addPT(offset, { ...testValues, loadEventEnd: 'test' }, {})
    expected = { ...expectedPT }
    delete expected.le
    expect(output3).toEqual(expected)

    const output4 = addPT(offset, { ...testValues, loadEventEnd: null }, {})
    expected = { ...expectedPT }
    delete expected.le
    expect(output4).toEqual(expected)
  })
})

describe('addPN()', () => {
  test('an output object is populated with valid values', () => {
    const output = addPN(testValues, {})
    expect(output).toEqual(expectedPN)
  })

  test('adds entries to navTimingValues', () => {
    const beforeLength = navTimingValues.length
    addPN(offset, { testValues }, {})
    const afterLength = navTimingValues.length
    expect(afterLength - beforeLength).toEqual(2)
  })
})
