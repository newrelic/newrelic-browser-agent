import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { wrapLogger } from '../../../src/common/wrap/wrap-logger'
import { setupAgent } from '../setup-agent'
import * as loggingUtilsModule from '../../../src/features/logging/shared/utils'
import { Instrument as Logging } from '../../../src/features/logging/instrument'
import { faker } from '@faker-js/faker'

let agentSetup

beforeAll(async () => {
  agentSetup = setupAgent()
})

let loggingInstrument

beforeEach(async () => {
  jest.spyOn(loggingUtilsModule, 'bufferLog')

  loggingInstrument = new Logging(agentSetup.agentIdentifier, { aggregator: agentSetup.aggregator, eventManager: agentSetup.eventManager })
})

test('should subscribe to wrap-logger events and buffer them', async () => {
  const instanceEE = ee.get(agentSetup.agentIdentifier)
  expect(instanceEE.on).toHaveBeenCalledWith('wrap-logger-end', expect.any(Function))

  const myLoggerSuite = {
    myTestLogger: jest.fn()
  }
  const customAttributes = { args: faker.string.uuid() }
  wrapLogger(loggingInstrument.ee, myLoggerSuite, 'myTestLogger', { customAttributes, level: 'error' })
  expect(loggingUtilsModule.bufferLog).toHaveBeenCalledTimes(0)

  const message = faker.string.uuid()
  myLoggerSuite.myTestLogger(message)
  expect(loggingUtilsModule.bufferLog).toHaveBeenCalledWith(loggingInstrument.ee, message, customAttributes, 'error')
})

test('wrapLogger should not re-wrap or overwrite context if called more than once', async () => {
  const myLoggerSuite = {
    myTestLogger: jest.fn()
  }
  const customAttributes = { args: faker.string.uuid() }
  wrapLogger(loggingInstrument.ee, myLoggerSuite, 'myTestLogger', { customAttributes, level: 'error' })
  expect(loggingUtilsModule.bufferLog).toHaveBeenCalledTimes(0)

  let message = faker.string.uuid()
  myLoggerSuite.myTestLogger(message)
  expect(loggingUtilsModule.bufferLog).toHaveBeenCalledWith(loggingInstrument.ee, message, customAttributes, 'error') // ignores args: 2

  /** re-wrap the logger with a NEW context, new events should NOT get that context because the wrapper should early-exit */
  wrapLogger(loggingInstrument.ee, myLoggerSuite, 'myTestLogger', { customAttributes: { args: 'abc' }, level: 'info' })
  message = faker.string.uuid()
  myLoggerSuite.myTestLogger(message)
  expect(loggingUtilsModule.bufferLog).toHaveBeenCalledWith(loggingInstrument.ee, message, customAttributes, 'error')
})
