import createWrapperWithEmitter from '../../../src/common/wrap/wrap-function'
import { ee } from '../../../src/common/event-emitter/contextual-ee'

let eeId = 0
let fooCallCount, barCallCount

beforeEach(() => {
  fooCallCount = barCallCount = 0
})
function foo () {
  fooCallCount += 1
}
function bar () {
  barCallCount += 1
}

test('recursive calls to wrapped functions from start/end event callbacks should not trigger more events', () => {
  const subEE = ee.get(eeId++)
  const wrappedFoo = createWrapperWithEmitter(subEE)(foo, 'fn-')

  let fnStartCount = 0
  let fnEndCount = 0

  subEE.on('fn-start', function () {
    fnStartCount += 1
    wrappedFoo()
  })
  subEE.on('fn-end', function () {
    fnEndCount += 1
    wrappedFoo()
  })
  wrappedFoo()

  expect(fooCallCount).toEqual(3) // foo should be called thrice
  expect(fnStartCount).toEqual(1)
  expect(fnEndCount).toEqual(1)
})

test('calls to other wrapped functions from start/end event callbacks should not trigger more events', () => {
  const subEE = ee.get(eeId++)
  const wrapper = createWrapperWithEmitter(subEE)
  const wrappedFoo = wrapper(foo, 'fn-')
  const wrappedBar = wrapper(bar, 'fn-')

  let fnStartCount = 0
  let fnEndCount = 0

  subEE.on('fn-start', function () {
    fnStartCount += 1
    wrappedBar()
  })
  subEE.on('fn-end', function () {
    fnEndCount += 1
    wrappedBar()
  })
  wrappedFoo()

  expect(fooCallCount).toEqual(1)
  expect(barCallCount).toEqual(2)
  expect(fnStartCount).toEqual(1)
  expect(fnEndCount).toEqual(1)
})

test('calls to other wrapped functions from start/end event callbacks with different prefix should not trigger more events', () => {
  const subEE = ee.get(eeId++)
  const wrapper = createWrapperWithEmitter(subEE)
  const wrappedFoo = wrapper(foo, 'foo-')
  const wrappedBar = wrapper(bar, 'bar-')

  let fooStartCount = 0
  let fooEndCount = 0
  let barStartCount = 0
  let barEndCount = 0

  subEE.on('foo-start', function () {
    fooStartCount += 1
    wrappedBar()
  })
  subEE.on('foo-end', function () {
    fooEndCount += 1
    wrappedBar()
  })
  subEE.on('bar-start', () => barStartCount++)
  subEE.on('bar-end', () => barEndCount++)
  wrappedFoo()
  wrappedBar()

  expect(fooCallCount).toEqual(1)
  expect(barCallCount).toEqual(3)
  expect(fooStartCount).toEqual(1)
  expect(fooEndCount).toEqual(1)
  expect(barStartCount).toEqual(1)
  expect(barEndCount).toEqual(1)
})

test('always flag allows nested calls', () => {
  const subEE = ee.get(eeId++)
  const alwaysWrappedFoo = createWrapperWithEmitter(subEE, true)(foo, 'foo-')
  const wrappedBar = createWrapperWithEmitter(subEE)(bar, 'bar-')

  let fooStartCount = 0
  let barStartCount = 0

  subEE.on('foo-start', function () {
    fooStartCount += 1
    wrappedBar()
  })
  subEE.on('bar-start', function () {
    barStartCount += 1
    alwaysWrappedFoo()
  })
  wrappedBar()
  alwaysWrappedFoo()

  expect(fooCallCount).toEqual(2)
  expect(barCallCount).toEqual(3)
  expect(fooStartCount).toEqual(2)
  expect(barStartCount).toEqual(1)
})
