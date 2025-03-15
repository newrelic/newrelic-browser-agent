import { faker } from '@faker-js/faker'
import * as sessionReplaySharedUtils from '../../../../../src/features/session_replay/shared/utils'
import * as runtimeConstantsModule from '../../../../../src/common/constants/runtime'
import * as initModule from '../../../../../src/common/config/init'
import * as featureGatesModule from '../../../../../src/features/utils/feature-gates'
import * as nreumModule from '../../../../../src/common/window/nreum'

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
    jest.mocked(initModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'session_replay.preload'
    })
    jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { MO: jest.fn() } })
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(initModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(initModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(initModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return false when mutation observers original is not present', async () => {
    jest.mocked(initModule.getConfigurationValue).mockReturnValue(true)
    jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { } })
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(initModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(initModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
    expect(initModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return false when session tracking is disabled', async () => {
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(false)
    jest.mocked(initModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'privacy.cookies_enabled'
    })
    jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { MO: jest.fn() } })

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(initModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(initModule.getConfigurationValue).not.toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })

  test('should return false when session trace is disabled', async () => {
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)
    jest.mocked(initModule.getConfigurationValue).mockImplementation((_, path) => {
      return path !== 'session_trace.enabled'
    })
    jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { MO: jest.fn() } })

    expect(sessionReplaySharedUtils.isPreloadAllowed(agentIdentifier)).toEqual(false)
    expect(initModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_replay.preload')
    expect(featureGatesModule.canEnableSessionTracking).toHaveBeenCalled()
    expect(initModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'session_trace.enabled')
  })
})

test('hasReplayPrerequisite should return false when replay prerequisites are not present', async () => {
  jest.mocked(initModule.getConfigurationValue).mockReturnValue(true)
  jest.mocked(initModule.getConfigurationValue).mockReturnValue(true)

  jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { } })

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

describe('customMasker', () => {
  test('should return input text as masked when the element is a non-password field and not decorated with unmask option', async () => {
    const text = 'foobar'
    const element = { type: 'string' }

    expect(sessionReplaySharedUtils.customMasker(text, element)).toEqual('******')
  })

  // NR-739491 - fixes issue where whitespace was masked, pushing layout/styling out-of-place
  test('should return input text as-is when the input text is whitespace and the element is a non-password field and not decorated with unmask option', async () => {
    const text = '   \n   '
    const element = { type: 'string' }

    expect(sessionReplaySharedUtils.customMasker(text, element)).toEqual('   \n   ')
  })

  test('should return input text as masked when the element is a password field', async () => {
    const text = 'foobar'
    const element = { type: 'password' }

    expect(sessionReplaySharedUtils.customMasker(text, element)).toEqual('******')
  })

  test('should return input text as masked when the input text is whitespace and the element is a password field', async () => {
    const text = '   \n   '
    const element = { type: 'password' }

    expect(sessionReplaySharedUtils.customMasker(text, element)).toEqual('*******')
  })

  test('should return input text as-is when the element is a non-password field decorated with unmask option', async () => {
    const text = 'foobar'
    const element = { type: 'string', dataset: { nrUnmask: true } }
    expect(sessionReplaySharedUtils.customMasker(text, element)).toEqual('foobar')

    const element2 = { type: 'string', classList: { contains: () => true } }
    expect(sessionReplaySharedUtils.customMasker(text, element2)).toEqual('foobar')
  })

  test('should return input text as-is when input text is whitespace and the element is a non-password field decorated with unmask option', async () => {
    const text = '   \n   '
    const element = { type: 'string', dataset: { nrUnmask: true } }
    expect(sessionReplaySharedUtils.customMasker(text, element)).toEqual('   \n   ')

    const element2 = { type: 'string', classList: { contains: () => true } }
    expect(sessionReplaySharedUtils.customMasker(text, element2)).toEqual('   \n   ')
  })
})
