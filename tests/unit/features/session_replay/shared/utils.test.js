import { faker } from '@faker-js/faker'
import * as sessionReplaySharedUtils from '../../../../../src/features/session_replay/shared/utils'
import * as runtimeConstantsModule from '../../../../../src/common/constants/runtime'
import * as configModule from '../../../../../src/common/config/config'
import * as featureGatesModule from '../../../../../src/features/utils/feature-gates'

jest.enableAutomock()
jest.unmock('../../../../../src/features/session_replay/shared/utils')

let agentIdentifier

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
})

describe('isPreloadAllowed', () => {
  beforeEach(() => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
  })

  test('should return false when session replay preload is disabled', async () => {
    jest.mocked(configModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'session_replay.preload'
    })
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return false when mutation observers original is not present', async () => {
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
    jest.replaceProperty(configModule, 'originals', {})
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return false when session tracking is disabled', async () => {
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(false)
    jest.mocked(configModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'privacy.cookies_enabled'
    })
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return false when session trace is disabled', async () => {
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)
    jest.mocked(configModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'session_trace.enabled'
    })
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(featureGatesModule.canEnableSessionTracking).toHaveBeenCalled()
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })
})

test('hasReplayPrerequisite should return false when replay prerequisites are not present', async () => {
  jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
  jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)

  jest.replaceProperty(configModule, 'originals', {})

  expect(sessionReplaySharedUtils.hasReplayPrerequisite(agentIdentifier)).toEqual(false)
})

describe('buildNRMetaNode', () => {
  let timekeeper

  beforeEach(() => {
    timekeeper = {
      correctAbsoluteTimestamp: jest.fn()
    }
  })

  test('should use the timekeeper to correct the timestamp', async () => {
    const timestamp = faker.date.anytime().getTime()
    const expected = faker.date.anytime().getTime()
    jest.spyOn(timekeeper, 'correctAbsoluteTimestamp').mockReturnValue(expected)

    const metadata = sessionReplaySharedUtils.buildNRMetaNode(timestamp, timekeeper)

    expect(metadata.originalTimestamp).toEqual(timestamp)
    expect(metadata.correctedTimestamp).toEqual(expected)
  })
})
