import { faker } from '@faker-js/faker'
import { globalScope } from '../../src/common/constants/runtime'

let promiseConstructorCalls

beforeEach(async () => {
  promiseConstructorCalls = []

  // Proxy the global Promise to prevent the wrapping from
  // messing with Jest internal promises
  window.Promise = new Proxy(class extends Promise {}, {
    construct (target, args) {
      promiseConstructorCalls.push(args)

      return Reflect.construct(target, args)
    }
  })

  ;(await import('../../src/common/wrap/wrap-promise')).wrapPromise()
})

afterEach(() => {
  jest.resetModules()
})

test('should wrap promise constructor', async () => {
  const promiseInstance = new globalScope.Promise(jest.fn())

  expect(promiseInstance).toBeInstanceOf(Promise)
  expect(promiseConstructorCalls.length).toBeGreaterThan(0)
  expect(globalScope.Promise.toString()).toMatch(/\[native code\]/)
  expect(globalScope.Promise.name).toEqual('Promise')
})

describe('all', () => {
  test('should work with acceptable iterables', async () => {
    const resolveValue = faker.string.uuid()
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

  test.each([null, undefined])('should not try to iterate a non-iterable %s', async (input) => {
    jest.spyOn(globalScope.Promise, 'resolve')

    await expect(globalScope.Promise.all(input)).rejects.toThrow()
    expect(globalScope.Promise.resolve).not.toHaveBeenCalled()
  })
})

describe('race', () => {
  test('should work with acceptable iterables', async () => {
    jest.spyOn(globalScope.Promise, 'resolve')

    const resolveValue = faker.string.uuid()
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
    expect(globalScope.Promise.resolve).toHaveBeenCalled()
  })

  test.each([null, undefined])('should not try to iterate a non-iterable %s', async (input) => {
    jest.spyOn(globalScope.Promise, 'resolve')

    await expect(globalScope.Promise.race(input)).rejects.toThrow()
    expect(globalScope.Promise.resolve).not.toHaveBeenCalled()
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
      },
      [Symbol.iterator] () {
        return this
      }
    }
  }
}
