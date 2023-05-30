/* eslint-disable no-global-assign */
/* eslint-disable no-extend-native */
import { getPolyfills } from './polyfill-detection'

// DO NOT test Function.prototype.apply, it causes recursion in Jest

test('should return an empty array when nothing is polyfilled', () => {
  expect(getPolyfills()).toEqual([])
})

test('should indicate Function.prototype.bind is polyfilled', () => {
  const originalFn = Function.prototype.bind
  Function.prototype.bind = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Function.bind'])

  Function.prototype.bind = originalFn
})

test('should indicate Function.prototype.call is polyfilled', () => {
  const originalFn = Function.prototype.call
  Function.prototype.call = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Function.call'])

  Function.prototype.call = originalFn
})

test('should indicate Array.prototype.includes is polyfilled', () => {
  const originalFn = Array.prototype.includes
  Array.prototype.includes = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Array.includes'])

  Array.prototype.includes = originalFn
})

test('should indicate Array.from is polyfilled', () => {
  const originalFn = Array.from
  Array.from = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Array.from'])

  Array.from = originalFn
})

test('should indicate Array.prototype.find is polyfilled', () => {
  const originalFn = Array.prototype.find
  Array.prototype.find = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Array.find'])

  Array.prototype.find = originalFn
})

test('should indicate Array.prototype.flat is polyfilled', () => {
  const originalFn = Array.prototype.flat
  Array.prototype.flat = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Array.flat'])

  Array.prototype.flat = originalFn
})

test('should indicate Array.prototype.flatMap is polyfilled', () => {
  const originalFn = Array.prototype.flatMap
  Array.prototype.flatMap = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Array.flatMap'])

  Array.prototype.flatMap = originalFn
})

test('should indicate Object.assign is polyfilled', () => {
  const originalFn = Object.assign
  Object.assign = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Object.assign'])

  Object.assign = originalFn
})

test('should indicate Object.entries is polyfilled', () => {
  const originalFn = Object.entries
  Object.entries = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Object.entries'])

  Object.entries = originalFn
})

test('should indicate Object.values is polyfilled', () => {
  const originalFn = Object.values
  Object.values = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Object.values'])

  Object.values = originalFn
})

test('should indicate Map constructor is polyfilled', () => {
  const originalFn = Map
  Map = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Map'])

  Map = originalFn
})

test('should indicate Set constructor is polyfilled', () => {
  const originalFn = Set
  Set = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['Set'])

  Set = originalFn
})

test('should indicate WeakMap constructor is polyfilled', () => {
  const originalFn = WeakMap
  WeakMap = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['WeakMap'])

  WeakMap = originalFn
})

test('should indicate WeakSet constructor is polyfilled', () => {
  const originalFn = WeakSet
  WeakSet = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual(['WeakSet'])

  WeakSet = originalFn
})
