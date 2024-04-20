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

describe.only('isPreloadAllowed', () => {
  beforeEach(() => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
  })

  test('should return false when session replay preload is disabled', async () => {
    jest.mocked(configModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'session_replay.preload'
    })
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })
    jest.spyOn(sessionReplaySharedUtils, 'enableSessionTracking').mockReturnValue(true)

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return false when mutation observers original is not present', async () => {
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
    jest.replaceProperty(configModule, 'originals', {})
    jest.spyOn(sessionReplaySharedUtils, 'enableSessionTracking').mockReturnValue(true)

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(configModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test.only('should return false when session tracking is disabled', async () => {
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
    jest.mocked(configModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'session_trace.enabled'
    })
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return true when stars align', () => {
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(true)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })
})

describe.only('canImportReplayAgg', () => {
  beforeEach(() => {
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
  })

  test('should return false when replay prerequisites are not present', async () => {
    jest.replaceProperty(configModule, 'originals', {})
    const sessionManager = {
      isNew: true
    }

    expect(sessionReplaySharedUtils.canImportReplayAgg(agentIdentifier, sessionManager)).toEqual(false)
  })

  test('should return true when session is new', async () => {
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })
    const sessionManager = {
      isNew: true
    }

    expect(sessionReplaySharedUtils.canImportReplayAgg(agentIdentifier, sessionManager)).toEqual(true)
  })

  test('should return true when replay already recording', async () => {
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })
    const sessionManager = {
      isNew: false,
      state: {
        sessionReplayMode: 1
      }
    }

    expect(sessionReplaySharedUtils.canImportReplayAgg(agentIdentifier, sessionManager)).toEqual(true)
  })

  test('should return false when session is not new and a replay is not already recording', async () => {
    jest.replaceProperty(configModule, 'originals', { MO: jest.fn() })
    const sessionManager = {
      isNew: false,
      state: {
        sessionReplayMode: 0
      }
    }

    expect(sessionReplaySharedUtils.canImportReplayAgg(agentIdentifier, sessionManager)).toEqual(false)
  })
})

describe.only('buildNRMetaNode', () => {
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
