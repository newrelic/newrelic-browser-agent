/* eslint-disable prefer-promise-reject-errors */
import { faker } from '@faker-js/faker'
import { globalScope } from '../../../src/common/constants/runtime'

let promiseEE
const originalPromise = window.Promise

beforeEach(async () => {
  // Proxy the global Promise to prevent the wrapping from
  // messing with Jest internal promises
  window.Promise = new Proxy(class extends Promise {}, {
    construct (target, args) {
      return Reflect.construct(target, args)
    }
  })

  promiseEE = (await import('../../../src/common/wrap/wrap-promise')).wrapPromise()
  jest.spyOn(promiseEE, 'emit')
})

afterEach(() => {
  jest.resetModules()
  window.Promise = originalPromise
})

test('Can create a wrapped promise', async () => {
  const promiseInstance = new Promise(jest.fn())

  expect(Promise).not.toBe(originalPromise) // double check we're referring to two different constructors
  expect(promiseInstance).toBeInstanceOf(originalPromise)
  expect(Promise.toString()).toMatch(/\[native code\]/)
  expect(Promise.name).toEqual('Promise')

  expect(promiseEE.emit.mock.calls.length).toEqual(2)
  expect(promiseEE.emit.mock.calls[0][0]).toEqual('executor-start')
  expect(promiseEE.emit.mock.calls[1][0]).toEqual('executor-end')
})

test('Wrapped promise has wrapped .then', async () => {
  await new Promise((resolve, reject) => {
    resolve()
  }).then(() => { // onfulfilled
    expect(promiseEE.emit).toHaveBeenCalledWith('resolve-end', expect.any(Array), expect.any(Object), undefined, false) // start of this cb
  }, () => { throw new Error('onrejected should not have been called') })

  await new Promise((resolve, reject) => {
    reject()
  }).then(() => { throw new Error('onfulfilled should not have been called') }, () => { // onrejected
    expect(promiseEE.emit).toHaveBeenCalledWith('resolve-end', expect.any(Array), expect.any(Object), undefined, false) // start of this cb
  })
})

test('A promise .then is chainable', async () => {
  expect.assertions(3)
  await new Promise(resolve => resolve(1)).then(onfulfilledVal => {
    expect(onfulfilledVal).toEqual(1)
    return new Promise(resolve => resolve(2)) // value should be passed onto next then
  }).then(onfulfilledVal => {
    expect(onfulfilledVal).toEqual(2) // then empty return
  }).then(onfulfilledVal => {
    expect(onfulfilledVal).toBeUndefined()
  })
})

test('Promise then chains are kept separate and distinct', async () => {
  expect.assertions(4)
  const promise = new Promise(resolve => resolve(1))
  promise.then(val => {
    expect(val).toEqual(1)
    return 2
  }).then(val => expect(val).toEqual(2))
  promise.then(val => {
    expect(val).toEqual(1)
    return 3
  }).then(val => expect(val).toEqual(3))

  await promise
})

test('Propagation caches resolved parent context once per chain', async () => {
  const sentinelCtx = {}
  const parentPromise = new Promise(resolve => resolve('parent'))
  const parentStore = promiseEE.context(parentPromise)
  parentStore.getCtx = jest.fn(() => sentinelCtx)

  const childPromise = parentPromise.then(() => {})
  const childStore = promiseEE.context(childPromise)

  expect(childStore.getCtx()).toBe(sentinelCtx)
  expect(childStore.getCtx()).toBe(sentinelCtx)
  expect(parentStore.getCtx).toHaveBeenCalledTimes(1)

  await childPromise
})

const thrownError = new Error('123')
test('A promise constructor exception can be caught', async () => {
  await new Promise(function (resolve, reject) {
    throw thrownError
  }).catch(onrejectedErr => {
    expect(onrejectedErr).toBe(thrownError)
  })
})
test('A promise then exception can be caught', async () => {
  await new Promise(resolve => resolve()).then(() => {
    throw thrownError
  }).catch(onrejectedErr => {
    expect(onrejectedErr).toBe(thrownError)
  })
})
test('A promise catch exception can also be caught', async () => {
  await new Promise((resolve, reject) => reject()).catch(onrejectedErr => {
    expect(onrejectedErr).toBeUndefined()
    throw thrownError
  }).catch(onrejectedErr => {
    expect(onrejectedErr).toBe(thrownError)
  })
})

test('Rejected promise chain calls .catch and is further chainable', async () => {
  expect.assertions(2)
  await new Promise(resolve => resolve()).then(() => {
    throw new Error('just because')
  }).catch(onrejectedErr => {
    expect(onrejectedErr.message).toEqual('just because')
  }).then(() => {
    expect(promiseEE.emit).not.toHaveBeenCalledWith('cb-err', expect.anything(), expect.anything(), expect.anything(), expect.anything()) // don't instrument caught error
  })
})

describe('Promise.resolve', () => {
  test('passes value', async () => {
    let val = await Promise.resolve(10)
    expect(val).toEqual(10)

    val = await Promise.resolve(new Promise(resolve => {
      setTimeout(() => resolve(123), 0)
    }))
    expect(val).toEqual(123)
  })

  test('returns an instanceof original Promise', () => {
    const promise = Promise.resolve()
    const unwrapped = originalPromise.resolve()

    expect(promise).toBeInstanceOf(window.Promise)
    expect(promise).toBeInstanceOf(originalPromise)
    expect(unwrapped).toBeInstanceOf(originalPromise)
  })
})

describe('Promise.reject', () => {
  test('throws exception with given value', async () => {
    expect(Promise.reject).toThrow()

    Promise.reject('error msg').catch(err => expect(err).toEqual('error msg'))
  })
})

describe('Promise.all', () => {
  test('still resolves with the values of each resolved promise', async () => {
    await Promise.all([Promise.resolve(123), Promise.resolve(456)]).then(onfulfilledVal => {
      expect(onfulfilledVal).toEqual([123, 456])
    })
  })
  test('throws if any promise rejects', async () => {
    await Promise.all([Promise.reject(123), Promise.resolve(456)]).then(() => {
      expect(true).toEqual(false) // this should not run
    }).catch(onrejectedVal => expect(onrejectedVal).toEqual(123))
  })
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

describe('Promise.race', () => {
  test('still resolves with value of earliest resolved Promise', async () => {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve(123), 100))
    await Promise.race([slowPromise, Promise.resolve(456)]).then(onfulfilledVal => {
      expect(onfulfilledVal).toEqual(456)
    })
  })
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
