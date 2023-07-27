import { faker } from '@faker-js/faker'
import { InstrumentBase } from './instrument-base'
import { FeatureBase } from './feature-base'
import { drain, registerDrain } from '../../common/drain/drain'
import { onWindowLoad } from '../../common/window/load'
import { lazyFeatureLoader } from './lazy-feature-loader'
import { getConfigurationValue } from '../../common/config/config'
import { setupAgentSession } from './agent-session'
import { warn } from '../../common/util/console'
import * as globalScopeModule from '../../common/constants/runtime'
import { FEATURE_NAMES } from '../../loaders/features/features'

jest.enableAutomock()
jest.unmock('./instrument-base')
jest.unmock('../../loaders/features/features')
jest.mock('../../common/drain/drain', () => ({
  __esModule: true,
  drain: jest.fn(),
  registerDrain: jest.fn()
}))
jest.mock('../../common/window/load', () => ({
  __esModule: true,
  onWindowLoad: jest.fn()
}))
jest.mock('../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: undefined,
  isWorkerScope: undefined
}))
jest.mock('../../common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn()
}))
jest.mock('../../common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn(),
  originals: {
    MO: jest.fn()
  }
}))
jest.mock('./feature-base', () => ({
  __esModule: true,
  FeatureBase: jest.fn(function (...args) {
    this.agentIdentifier = args[0]
    this.aggregator = args[1]
    this.featureName = args[2]
  })
}))
jest.mock('./agent-session', () => ({
  __esModule: true,
  setupAgentSession: jest.fn()
}))

let agentIdentifier
let aggregator
let featureName
let mockAggregate

beforeEach(() => {
  jest.replaceProperty(globalScopeModule, 'isBrowserScope', true)
  jest.replaceProperty(globalScopeModule, 'isWorkerScope', false)

  agentIdentifier = faker.datatype.uuid()
  aggregator = {}
  featureName = faker.datatype.uuid()

  mockAggregate = jest.fn()
  jest.mocked(lazyFeatureLoader).mockResolvedValue({ Aggregate: mockAggregate })
})

test('should construct a new instrument', () => {
  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)

  expect(FeatureBase).toHaveBeenCalledWith(agentIdentifier, aggregator, featureName)
  expect(instrument.featAggregate).toBeUndefined()
  expect(instrument.auto).toEqual(true)
  expect(instrument.abortHandler).toBeUndefined()
  expect(registerDrain).toHaveBeenCalledWith(agentIdentifier, featureName)
})

test('should not immediately drain', () => {
  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName, false)

  expect(registerDrain).not.toHaveBeenCalled()
})

test('should import aggregator on window load', async () => {
  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.datatype.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(onWindowLoad).toHaveBeenCalledWith(expect.any(Function), true)
  expect(lazyFeatureLoader).toHaveBeenCalledWith(featureName, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
})

test('should immediately import aggregator in worker scope', async () => {
  jest.replaceProperty(globalScopeModule, 'isBrowserScope', false)
  jest.replaceProperty(globalScopeModule, 'isWorkerScope', true)

  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.datatype.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  // In worker scope, we cannot wait on importLater method
  await new Promise(process.nextTick)

  expect(onWindowLoad).not.toHaveBeenCalled()
  expect(lazyFeatureLoader).toHaveBeenCalledWith(featureName, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
})

test('should import the session manager and replay aggregate for new session', async () => {
  jest.mocked(getConfigurationValue).mockReturnValue(true)
  jest.mocked(setupAgentSession).mockReturnValue({
    isNew: true
  })

  const instrument = new InstrumentBase(agentIdentifier, aggregator, FEATURE_NAMES.sessionReplay)
  const aggregateArgs = { [faker.datatype.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  expect(setupAgentSession).toHaveBeenCalledWith(agentIdentifier)
  expect(lazyFeatureLoader).toHaveBeenCalledWith(FEATURE_NAMES.sessionReplay, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
})

test('should import the session manager and replay aggregate when a recording is active', async () => {
  jest.mocked(getConfigurationValue).mockReturnValue(true)
  jest.mocked(setupAgentSession).mockReturnValue({
    isNew: false,
    state: {
      sessionReplay: 1
    }
  })

  const instrument = new InstrumentBase(agentIdentifier, aggregator, FEATURE_NAMES.sessionReplay)
  const aggregateArgs = { [faker.datatype.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  expect(setupAgentSession).toHaveBeenCalledWith(agentIdentifier)
  expect(lazyFeatureLoader).toHaveBeenCalledWith(FEATURE_NAMES.sessionReplay, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
})

test('should not import session aggregate when session is not new and a recording is not active', async () => {
  jest.mocked(getConfigurationValue).mockReturnValue(true)
  jest.mocked(setupAgentSession).mockReturnValue({
    isNew: false,
    state: {
      sessionReplay: 0
    }
  })

  const instrument = new InstrumentBase(agentIdentifier, aggregator, FEATURE_NAMES.sessionReplay)
  const aggregateArgs = { [faker.datatype.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  expect(setupAgentSession).toHaveBeenCalledWith(agentIdentifier)
  expect(drain).toHaveBeenCalledWith(agentIdentifier, FEATURE_NAMES.sessionReplay)
  expect(lazyFeatureLoader).not.toHaveBeenCalled()
  expect(mockAggregate).not.toHaveBeenCalled()
})

test('feature still imports by default even when setupAgentSession throws an error', async () => {
  jest.mocked(getConfigurationValue).mockReturnValue(true)
  jest.mocked(setupAgentSession).mockImplementation(() => { throw new Error(faker.lorem.sentence()) })

  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.datatype.uuid()]: faker.lorem.sentence() }
  instrument.abortHandler = jest.fn()
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(onWindowLoad).toHaveBeenCalledWith(expect.any(Function), true)
  expect(instrument.abortHandler).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('A problem occurred when starting up session manager'), expect.any(Error))
  expect(lazyFeatureLoader).toHaveBeenCalled()
  expect(mockAggregate).toHaveBeenCalled()
  await expect(instrument.onAggregateImported).resolves.toBe(true)
})

test('no uncaught async exception is thrown when an import fails', async () => {
  jest.mocked(lazyFeatureLoader).mockRejectedValue(new Error('ChunkLoadError')) // () => { throw new Error('ChunkLoadError: loading chunk xxx failed.') })
  const mockOnError = jest.fn()
  global.onerror = mockOnError

  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  instrument.abortHandler = jest.fn()
  instrument.importAggregator()

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(warn).toHaveBeenNthCalledWith(2, expect.stringContaining(`Downloading and initializing ${featureName} failed`), expect.any(Error))
  expect(instrument.abortHandler).toHaveBeenCalled()
  await expect(instrument.onAggregateImported).resolves.toBe(false)
  expect(mockOnError).not.toHaveBeenCalled()
})
