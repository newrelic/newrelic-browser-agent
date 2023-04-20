import { faker } from '@faker-js/faker'
import { globalScope } from '../util/global-scope'
import { originals } from '../config/config'

jest.mock('./wrap-function', () => ({
  __esModule: true,
  createWrapperWithEmitter: jest.fn(() => (fn) => (...args) => {
    return fn.apply(null, args)
  })
}))
jest.mock('../event-emitter/contextual-ee', () => ({
  __esModule: true,
  getOrSetContext: jest.fn(() => ({})),
  ee: {
    get: jest.fn((name) => ({
      debugId: name,
      on: jest.fn(),
      context: jest.fn(() => ({})),
      emit: jest.fn()
    }))
  }
}))
jest.mock('../config/config', () => ({
  __esModule: true,
  originals: {}
}))
jest.mock('../util/global-scope', () => ({
  __esModule: true,
  globalScope: {
    NREUM: {}
  }
}))

let promiseConstructorCalls

beforeEach(async () => {
  promiseConstructorCalls = []

  // Proxy the global Promise to prevent the wrapping from
  // messing with Jest internal promises
  originals.PR = new Proxy(class extends Promise {}, {
    construct (target, args) {
      promiseConstructorCalls.push(args)

      return Reflect.construct(target, args)
    }
  })

  ;(await import('./wrap-promise')).wrapPromise()
})

afterEach(() => {
  jest.resetModules()
})

test('should wrap promise constructor', async () => {
  const promiseInstance = new globalScope.Promise(jest.fn())

  expect(promiseInstance).toBeInstanceOf(Promise)
  expect(promiseConstructorCalls.length).toEqual(1)
  expect(globalScope.Promise.toString()).toMatch(/\[native code\]/)
  expect(globalScope.Promise.name).toEqual('Promise')
})

describe('all', () => {
  test('should acceptable iterables', async () => {
    const resolveValue = faker.datatype.uuid()
    const customIterable = new CustomIterable([
      new globalScope.Promise(resolve => resolve(resolveValue))
    ])
    const arrayIterable = [
      new globalScope.Promise(resolve => resolve(resolveValue))
    ]
    const setIterable = new Set()
    setIterable.add(new globalScope.Promise(resolve => resolve(resolveValue)))

    await expect(globalScope.Promise.all(customIterable)).resolves.toEqual([resolveValue])
    await expect(globalScope.Promise.all(arrayIterable)).resolves.toEqual([resolveValue])
    await expect(globalScope.Promise.all(setIterable)).resolves.toEqual([resolveValue])
  })
})

describe('race', () => {
  test('should acceptable iterables', async () => {
    const resolveValue = faker.datatype.uuid()
    const customIterable = new CustomIterable([
      new globalScope.Promise(resolve => resolve(resolveValue))
    ])
    const arrayIterable = [
      new globalScope.Promise(resolve => resolve(resolveValue))
    ]
    const setIterable = new Set()
    setIterable.add(new globalScope.Promise(resolve => resolve(resolveValue)))

    await expect(globalScope.Promise.race(customIterable)).resolves.toEqual(resolveValue)
    await expect(globalScope.Promise.race(arrayIterable)).resolves.toEqual(resolveValue)
    await expect(globalScope.Promise.race(setIterable)).resolves.toEqual(resolveValue)
  })
})

class CustomIterable {
  #iterables = []

  constructor (iterables) {
    this.#iterables = iterables
  }

  [Symbol.iterator] () {
    return {
      index: 0,
      iterables: this.#iterables,
      next () {
        return {
          done: this.index >= this.iterables.length,
          value: this.iterables[this.index++] || undefined
        }
      }
    }
  }
}
