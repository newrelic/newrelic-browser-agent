import { faker } from '@faker-js/faker'
import { InstrumentBase } from '../../../../src/features/utils/instrument-base'
import { FeatureBase } from '../../../../src/features/utils/feature-base'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'
import { drain, registerDrain } from '../../../../src/common/drain/drain'
import { onWindowLoad } from '../../../../src/common/window/load'
import { lazyFeatureLoader } from '../../../../src/features/utils/lazy-feature-loader'
import { setupAgentSession } from '../../../../src/features/utils/agent-session'
import { warn } from '../../../../src/common/util/console'
import * as runtimeConstantsModule from '../../../../src/common/constants/runtime'
import { canEnableSessionTracking } from '../../../../src/features/utils/feature-gates'
import { getConfigurationValue } from '../../../../src/common/config/init'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/instrument-base')

let agentIdentifier
let aggregator
let featureName
let mockAggregate

beforeEach(() => {
  jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
  jest.replaceProperty(runtimeConstantsModule, 'isWorkerScope', false)
  jest.mocked(canEnableSessionTracking).mockReturnValue(true)

  agentIdentifier = faker.string.uuid()
  aggregator = {}
  featureName = faker.string.uuid()

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

test('should wait for feature opt-in to import the aggregate', () => {
  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName, false)
  jest.spyOn(instrument, 'importAggregator').mockImplementation(jest.fn)

  expect(registerDrain).not.toHaveBeenCalled()
  expect(instrument.auto).toEqual(false)

  const optInCallback = jest.mocked(instrument.ee.on).mock.calls[0][1]
  optInCallback()

  expect(registerDrain).toHaveBeenCalledWith(agentIdentifier, featureName)
  expect(instrument.importAggregator).toHaveBeenCalledTimes(1)
  expect(instrument.auto).toEqual(true)
})

test('should import aggregator on window load', async () => {
  jest.mocked(getConfigurationValue).mockReturnValue({ feature_flags: [] })
  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.string.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(onWindowLoad).toHaveBeenCalledWith(expect.any(Function), true)
  expect(lazyFeatureLoader).toHaveBeenCalledWith(featureName, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
})

test('should immediately import aggregator in worker scope', async () => {
  jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', false)
  jest.replaceProperty(runtimeConstantsModule, 'isWorkerScope', true)

  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.string.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  // In worker scope, we cannot wait on importLater method
  await new Promise(process.nextTick)

  expect(onWindowLoad).not.toHaveBeenCalled()
  expect(lazyFeatureLoader).toHaveBeenCalledWith(featureName, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
})

test('should not import aggregate more than once', async () => {
  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.string.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(mockAggregate).toHaveBeenCalledTimes(1)
})

test('feature still imports by default even when setupAgentSession throws an error', async () => {
  jest.mocked(setupAgentSession).mockImplementation(() => { throw new Error(faker.lorem.sentence()) })

  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.string.uuid()]: faker.lorem.sentence() }
  instrument.abortHandler = jest.fn()
  instrument.importAggregator(aggregateArgs)
  expect(instrument.featAggregate).toBeUndefined()

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(lazyFeatureLoader).toHaveBeenCalledWith(featureName, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
  expect(instrument.featAggregate).toBeDefined()
})

test('no uncaught async exception is thrown when an import fails', async () => {
  jest.mocked(lazyFeatureLoader).mockRejectedValue(new Error('ChunkLoadError')) // () => { throw new Error('ChunkLoadError: loading chunk xxx failed.') })
  const mockOnError = jest.fn()
  global.onerror = mockOnError

  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  instrument.abortHandler = jest.fn()
  instrument.importAggregator()
  expect(instrument.featAggregate).toBeUndefined()

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(warn).toHaveBeenCalledWith(34, expect.any(Error))
  expect(instrument.abortHandler).toHaveBeenCalled()
  expect(drain).toHaveBeenCalledWith(agentIdentifier, featureName, true)
  expect(instrument.featAggregate).toBeUndefined()
  expect(mockOnError).not.toHaveBeenCalled()
})

test('should not import agent-session when session tracking is disabled', async () => {
  jest.mocked(canEnableSessionTracking).mockReturnValue(false)

  const instrument = new InstrumentBase(agentIdentifier, aggregator, featureName)
  const aggregateArgs = { [faker.string.uuid()]: faker.lorem.sentence() }
  instrument.abortHandler = jest.fn()
  instrument.importAggregator(aggregateArgs)
  expect(instrument.featAggregate).toBeUndefined()

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(setupAgentSession).not.toHaveBeenCalled()
  expect(lazyFeatureLoader).toHaveBeenCalledWith(featureName, 'aggregate')
  expect(mockAggregate).toHaveBeenCalledWith(agentIdentifier, aggregator, aggregateArgs)
  expect(instrument.featAggregate).toBeDefined()
})

test('should drain and not import agg when shouldImportAgg is false for session_replay', async () => {
  jest.mocked(canEnableSessionTracking).mockReturnValue(false)

  const instrument = new InstrumentBase(agentIdentifier, aggregator, FEATURE_NAMES.sessionReplay)
  const aggregateArgs = { [faker.string.uuid()]: faker.lorem.sentence() }
  instrument.importAggregator(aggregateArgs)

  const windowLoadCallback = jest.mocked(onWindowLoad).mock.calls[0][0]
  await windowLoadCallback()

  expect(drain).toHaveBeenCalledWith(agentIdentifier, FEATURE_NAMES.sessionReplay)
  expect(lazyFeatureLoader).not.toHaveBeenCalled()
  expect(mockAggregate).not.toHaveBeenCalled()
})
