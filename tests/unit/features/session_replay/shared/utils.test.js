import * as sessionReplaySharedUtils from '../../../../../src/features/session_replay/shared/utils'
import * as runtimeConstantsModule from '../../../../../src/common/constants/runtime'
import * as featureGatesModule from '../../../../../src/features/utils/feature-gates'
import * as nreumModule from '../../../../../src/common/window/nreum'

jest.enableAutomock()
jest.unmock('../../../../../src/features/session_replay/shared/utils')

describe('isPreloadAllowed', () => {
  beforeEach(() => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { MO: jest.fn() } })
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(true)
  })

  test('should return false when session replay preload is disabled', () => {
    expect(sessionReplaySharedUtils.isPreloadAllowed({ session_replay: { preload: false } })).toEqual(false)
  })

  test('should return false when mutation observers original is not present', () => {
    jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { } })

    expect(sessionReplaySharedUtils.isPreloadAllowed({ session_replay: { preload: true }, session_trace: { enabled: true } })).toEqual(false)
  })

  test('should return false when session tracking is disabled', () => {
    jest.mocked(featureGatesModule.canEnableSessionTracking).mockReturnValue(false)

    expect(sessionReplaySharedUtils.isPreloadAllowed({ session_replay: { preload: true }, session_trace: { enabled: true } })).toEqual(false)
  })

  test('should return false when session trace is disabled', () => {
    expect(sessionReplaySharedUtils.isPreloadAllowed({ session_replay: { preload: true }, session_trace: { enabled: false } })).toEqual(false)
    expect(featureGatesModule.canEnableSessionTracking).toHaveBeenCalled()
  })
})

test('hasReplayPrerequisite should return false when replay prerequisites are not present', async () => {
  jest.mocked(nreumModule.gosNREUMOriginals).mockReturnValue({ o: { } })

  expect(sessionReplaySharedUtils.hasReplayPrerequisite({ session_trace: { enabled: true }, privacy: { cookies_enabled: true } })).toEqual(false)
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
