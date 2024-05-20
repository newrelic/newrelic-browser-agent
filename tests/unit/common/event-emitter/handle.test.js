import { faker } from '@faker-js/faker'

jest.mock('../../../../src/common/event-emitter/contextual-ee', () => ({
  __esModule: true,
  ee: {
    buffer: jest.fn(),
    emit: jest.fn(),
    get: jest.fn(() => ({
      buffer: jest.fn(),
      emit: jest.fn()
    }))
  }
}))

afterEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
})

test('it should create and use a default event-emitter', async () => {
  const { ee } = await import('../../../../src/common/event-emitter/contextual-ee')
  const { handle } = await import('../../../../src/common/event-emitter/handle')

  const handleEE = jest.mocked(ee.get).mock.results[0].value
  const eventType = faker.string.uuid()
  const eventArgs = ['a', 'b', 'c']
  const eventContext = {}
  const eventGroup = faker.string.uuid()

  handle(eventType, eventArgs, eventContext, eventGroup)

  expect(handleEE.buffer).toHaveBeenCalledWith([eventType], eventGroup)
  expect(handleEE.emit).toHaveBeenCalledWith(eventType, eventArgs, eventContext)
})

test('it should use the provided scoped event-emitter', async () => {
  const { ee } = await import('../../../../src/common/event-emitter/contextual-ee')
  const { handle } = await import('../../../../src/common/event-emitter/handle')
  const scopedEE = {
    buffer: jest.fn(),
    emit: jest.fn()
  }

  const handleEE = jest.mocked(ee.get).mock.results[0].value
  const eventType = faker.string.uuid()
  const eventArgs = ['a', 'b', 'c']
  const eventContext = {}
  const eventGroup = faker.string.uuid()

  handle(eventType, eventArgs, eventContext, eventGroup, scopedEE)

  expect(handleEE.buffer).not.toHaveBeenCalled()
  expect(handleEE.emit).not.toHaveBeenCalled()
  expect(scopedEE.buffer).toHaveBeenCalledWith([eventType], eventGroup)
  expect(scopedEE.emit).toHaveBeenCalledWith(eventType, eventArgs, eventContext)
})
