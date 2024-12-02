/**
 * The runtime module exports variables whose values are set at the time of import and
 * can depend on the environment the agent is running within. To make testing this module
 * easier, use async import to import the module and only use the node jest environment so
 * we can more easily define environment variables.
 * @jest-environment node
 */

import { faker } from '@faker-js/faker'

beforeEach(() => {
  // We assume every runtime has a global navigator variable
  global.navigator = {
    userAgent: faker.lorem.sentence()
  }
})

afterEach(() => {
  delete global.navigator
  jest.resetModules()
})

test('should indicate agent is running in a browser scope', async () => {
  const mockedWindow = global.window = {
    [faker.string.uuid()]: faker.lorem.sentence,
    document: {
      [faker.string.uuid()]: faker.lorem.sentence
    }
  }

  const runtime = await import('../../../../src/common/constants/runtime')

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

  const runtime = await import('../../../../src/common/constants/runtime')

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

  const runtime = await import('../../../../src/common/constants/runtime')

  delete global.WorkerGlobalScope
  delete global.WorkerNavigator
  global.globalThis = cachedGlobalThis

  expect(runtime.isBrowserScope).toEqual(false)
  expect(runtime.isWorkerScope).toEqual(true)
  expect(runtime.globalScope).toEqual(mockedGlobalThis)
})

test('should store the initial page location', async () => {
  const initialLocation = faker.internet.url()
  const mockedWindow = global.window = {
    [faker.string.uuid()]: faker.lorem.sentence,
    document: {
      [faker.string.uuid()]: faker.lorem.sentence
    },
    location: {
      href: initialLocation,
      toString () {
        return this.href
      }
    }
  }

  const runtime = await import('../../../../src/common/constants/runtime')
  mockedWindow.location.href = faker.internet.url()

  delete global.window

  expect(runtime.initialLocation).toEqual(initialLocation)
  expect(runtime.initialLocation).not.toEqual(mockedWindow.location.href)
})

test.each([
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: true },
  { userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: true },
  { userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: true },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15', expected: false },
  { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0', expected: false },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.4; rv:109.0) Gecko/20100101 Firefox/114.0', expected: false }
])('should set isiOS to $expected for $userAgent', async ({ userAgent, expected }) => {
  global.navigator.userAgent = userAgent
  global.window = { navigator: global.navigator, document: true }

  const runtime = await import('../../../../src/common/constants/runtime')

  expect(runtime.isiOS).toEqual(expected)
  delete global.window
})

test.each([
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: false },
  { userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: false },
  { userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: false },
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1', expected: true },
  { userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1', expected: true },
  { userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1', expected: true },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15', expected: false },
  { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0', expected: false },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.4; rv:109.0) Gecko/20100101 Firefox/114.0', expected: false }
])('should set iOSBelow16 to $expected for $userAgent', async ({ userAgent, expected }) => {
  if (!expected) {
    global.SharedWorker = class SharedWorker {}
  }
  global.navigator.userAgent = userAgent
  global.window = { navigator: global.navigator, document: true }

  const runtime = await import('../../../../src/common/constants/runtime')

  delete global.SharedWorker

  expect(runtime.iOSBelow16).toEqual(expected)
  delete global.window
})

test.each([
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: 0 },
  { userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: 0 },
  { userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', expected: 0 },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15', expected: 0 },
  { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0', expected: 114 },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.4; rv:109.0) Gecko/20100101 Firefox/114.0', expected: 114 }
])('should set ffVersion to $expected for $userAgent', async ({ userAgent, expected }) => {
  global.navigator.userAgent = userAgent
  global.window = { navigator: global.navigator, document: true }

  const runtime = await import('../../../../src/common/constants/runtime')

  expect(runtime.ffVersion).toEqual(expected)
  delete global.window
})
