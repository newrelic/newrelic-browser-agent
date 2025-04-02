import * as runtimeConstantsModule from '../../../../src/common/constants/runtime'
import { canEnableSessionTracking } from '../../../../src/features/utils/feature-gates'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/feature-gates')

describe('enableSessionTracking', () => {
  test('should return false when not browser scope', async () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', false)
    const init = { privacy: { cookies_enabled: true } }

    expect(canEnableSessionTracking(init)).toEqual(false)
  })

  test('should return false when session tracking disabled', async () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    const init = { privacy: { cookies_enabled: false } }

    expect(canEnableSessionTracking(init)).toEqual(false)
  })

  test('should return true when stars align', () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    const init = { privacy: { cookies_enabled: true } }

    expect(canEnableSessionTracking(init)).toEqual(true)
  })
})
