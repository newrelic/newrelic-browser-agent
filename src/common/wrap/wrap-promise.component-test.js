import { faker } from '@faker-js/faker'
import { globalScope } from '../constants/runtime'

beforeEach(async () => {
  ;(await import('./wrap-promise')).wrapPromise()
})

afterEach(() => {
  jest.resetModules()
})

test('should wrap promise constructor', async () => {
  const promiseInstance = new globalScope.Promise(jest.fn())

  expect(promiseInstance).toBeInstanceOf(Promise)
  expect(promiseInstance.ctx).toBeDefined()
  expect(globalScope.Promise.toString()).toMatch(/\[native code\]/)
  expect(globalScope.Promise.name).toEqual('Promise')
})

describe('support ES6 extends', () => {
  let staticUUID
  let instanceUUID
  let MyPromise
  let thenCaptor

  beforeEach(() => {
    thenCaptor = jest.fn()
    staticUUID = faker.datatype.uuid()
    instanceUUID = faker.datatype.uuid()

    MyPromise = class extends globalScope.Promise {
      static staticUUID = staticUUID

      instanceUUID = instanceUUID

      then (resolve, reject) {
        const result = super.then(resolve, reject)

        thenCaptor(this, resolve, reject)

        return result
      }

      myStaticInstanceUUID () {
        return MyPromise.staticUUID
      }

      myFunc () {
        return this.#myPrivateFunc()
      }

      #myPrivateFunc () {
        return true
      }
    }
  })

  test('should contain custom class properties', async () => {
    const instance = new MyPromise(() => {})

    expect(typeof instance.myFunc).toEqual('function')
    expect(instance.myFunc()).toEqual(true)
  })

  test('should contain static class properties', async () => {
    expect(MyPromise.staticUUID).toEqual(staticUUID)

    const instance = new MyPromise(() => {})

    expect(instance.myStaticInstanceUUID()).toEqual(staticUUID)
    expect(instance.constructor.staticUUID).toEqual(staticUUID)
  })

  test('should contain instance class properties', async () => {
    const instance = new MyPromise(() => {})

    expect(instance.instanceUUID).toEqual(instanceUUID)
  })

  test('should call instance defined then function', async () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const instance = new MyPromise(() => {})
    instance.then(resolve, reject)

    expect(thenCaptor).toHaveBeenCalledWith(instance, resolve, reject)
  })
})

describe('all', () => {
  test('should work with acceptable iterables', async () => {
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

  test.each([null, undefined])('should not try to iterate a non-iterable %s', async (input) => {
    jest.spyOn(globalScope.Promise, 'resolve')

    await expect(globalScope.Promise.all(input)).rejects.toThrow()
    expect(globalScope.Promise.resolve).not.toHaveBeenCalled()
  })
})

describe('race', () => {
  test('should work with acceptable iterables', async () => {
    jest.spyOn(globalScope.Promise, 'resolve')

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
