/*
The global-scope module contains exports that are defined once at the time
of importing the module. For this reason, the module must be dynamically
imported in each test case.

A scope must always exist or importing the module will throw an error. Use
`enableWorkerScope` to enable the worker scope. Be sure to call `disableWorkerScope`
before any calls to `expect` or the test will fail with an error from Jest.
*/

import { faker } from '@faker-js/faker'

afterEach(() => {
  jest.restoreAllMocks()
  jest.resetModules()
})

test('should indicate a browser scope', async () => {
  jest.spyOn(global, 'window', 'get').mockReturnValue({ document: {} })

  const globalScopeModule = await import('./global-scope')

  expect(globalScopeModule.isBrowserScope).toBe(true)
  expect(globalScopeModule.isWorkerScope).toBe(false)
  expect(globalScopeModule.globalScope).toBe(global.window)
})

test('should indicate a worker scope', async () => {
  enableWorkerScope()
  const globalScopeModule = await import('./global-scope')
  const mockedGlobalThis = global.globalThis
  disableWorkerScope()

  expect(globalScopeModule.isBrowserScope).toBe(false)
  expect(globalScopeModule.isWorkerScope).toBe(true)
  expect(globalScopeModule.globalScope).toBe(mockedGlobalThis)
})

test('should return the self global', async () => {
  enableWorkerScope()
  jest.replaceProperty(global, 'globalThis', null)
  jest.spyOn(global, 'self', 'get').mockReturnValue(new global.WorkerGlobalScope())

  const globalScopeModule = await import('./global-scope')
  const mockedGlobalSelf = global.self
  disableWorkerScope()

  expect(globalScopeModule.isBrowserScope).toBe(false)
  expect(globalScopeModule.isWorkerScope).toBe(true)
  expect(globalScopeModule.globalScope).toBe(mockedGlobalSelf)
})

test('should throw an error when a scope cannot be defined', async () => {
  jest.spyOn(global, 'window', 'get').mockReturnValue(undefined)

  await expect(() => import('./global-scope')).rejects.toThrow()
})

test('should immediately store the current location', async () => {
  const url = faker.internet.url()
  jest.spyOn(window, 'location', 'get').mockReturnValue(url)

  const globalScopeModule = await import('./global-scope')

  expect(globalScopeModule.initialLocation).toBe(url)
})

function enableWorkerScope () {
  jest.spyOn(global, 'window', 'get').mockReturnValue(undefined)

  class WorkerNavigator {}
  class WorkerGlobalScope {
    navigator = new WorkerNavigator()
  }
  global.WorkerGlobalScope = WorkerGlobalScope
  global.WorkerNavigator = WorkerNavigator

  jest.spyOn(global, 'navigator', 'get').mockReturnValue(new global.WorkerNavigator())
  jest.replaceProperty(global, 'globalThis', new WorkerGlobalScope())
}

function disableWorkerScope () {
  delete global.WorkerGlobalScope
  delete global.WorkerNavigator

  jest.restoreAllMocks()
}
