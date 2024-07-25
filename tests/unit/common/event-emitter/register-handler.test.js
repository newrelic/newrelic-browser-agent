import { faker } from '@faker-js/faker'

jest.mock('../../../../src/common/event-emitter/handle', () => ({
  __esModule: true,
  handleEE: {}
}))

afterEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
})

test('should default group to "feature"', async () => {
  const { handleEE } = await import('../../../../src/common/event-emitter/handle')
  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')

  const eventType = faker.string.uuid()
  const eventHandler = jest.fn()

  registerHandler(eventType, eventHandler)

  expect(registerHandler.handlers.feature).toEqual(expect.objectContaining({
    [eventType]: [expect.arrayContaining([
      handleEE, eventHandler
    ])]
  }))
})

test('should use the provided group', async () => {
  const { handleEE } = await import('../../../../src/common/event-emitter/handle')
  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')

  const eventType = faker.string.uuid()
  const eventGroup = faker.string.uuid()
  const eventHandler = jest.fn()

  registerHandler(eventType, eventHandler, eventGroup)

  expect(registerHandler.handlers[eventGroup]).toEqual(expect.objectContaining({
    [eventType]: [expect.arrayContaining([
      handleEE, eventHandler
    ])]
  }))
})

test('should use the provided event-emitter', async () => {
  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')

  const scopedEE = {}
  const eventType = faker.string.uuid()
  const eventGroup = faker.string.uuid()
  const eventHandler = jest.fn()

  registerHandler(eventType, eventHandler, eventGroup, scopedEE)

  expect(registerHandler.handlers[eventGroup]).toEqual(expect.objectContaining({
    [eventType]: [expect.arrayContaining([
      scopedEE, eventHandler
    ])]
  }))
})
