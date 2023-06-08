/**
 * The runtime module exports variables whose values are set at the time of import and
 * can depend on the environment the agent is running within. To make testing this module
 * easier, use async import to import the module and only use the node jest environment so
 * we can more easily define environment variables.
 * @jest-environment node
 */

import { faker } from '@faker-js/faker'

afterEach(() => {
  jest.resetModules()
})

test('should indicate agent is running in a browser scope', async () => {
  const mockedWindow = global.window = {
    [faker.datatype.uuid()]: faker.lorem.sentence,
    document: {
      [faker.datatype.uuid()]: faker.lorem.sentence
    }
  }

  const runtime = await import('./runtime')

  delete global.window

  expect(runtime.isBrowserScope).toEqual(true)
  expect(runtime.isWorkerScope).toEqual(false)
  expect(runtime.globalScope).toEqual(mockedWindow)
})

test('should indicate agent is running in a worker scope using global self variable', async () => {
  global.WorkerGlobalScope = class WorkerGlobalScope {}
  global.WorkerNavigator = class WorkerNavigator {}
  const mockedGlobalSelf = global.self = new global.WorkerGlobalScope()
  mockedGlobalSelf.navigator = new global.WorkerNavigator()

  const runtime = await import('./runtime')

  delete global.WorkerGlobalScope
  delete global.WorkerNavigator
  delete global.self

  expect(runtime.isBrowserScope).toEqual(false)
  expect(runtime.isWorkerScope).toEqual(true)
  expect(runtime.globalScope).toEqual(mockedGlobalSelf)
})

test('should indicate agent is running in a worker scope using global self variable', async () => {
  global.WorkerGlobalScope = class WorkerGlobalScope {}
  global.WorkerNavigator = class WorkerNavigator {}
  const cachedGlobalThis = global.globalThis
  const mockedGlobalThis = global.globalThis = new WorkerGlobalScope()
  Object.defineProperties(global.globalThis, Object.getOwnPropertyDescriptors(cachedGlobalThis))
  global.globalThis.navigator = new WorkerNavigator()

  const runtime = await import('./runtime')

  delete global.WorkerGlobalScope
  delete global.WorkerNavigator
  global.globalThis = cachedGlobalThis

  expect(runtime.isBrowserScope).toEqual(false)
  expect(runtime.isWorkerScope).toEqual(true)
  expect(runtime.globalScope).toEqual(mockedGlobalThis)
})
