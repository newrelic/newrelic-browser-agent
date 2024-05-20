import { faker } from '@faker-js/faker'
import * as runtimeConstantsModule from '../../../../src/common/constants/runtime'
import * as configModule from '../../../../src/common/config/config'
import { canEnableSessionTracking } from '../../../../src/features/utils/feature-gates'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/feature-gates')

let agentIdentifier

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
})

describe('enableSessionTracking', () => {
  test('should return false when not browser scope', async () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', false)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).not.toHaveBeenCalled()
  })

  test('should return false when session tracking disabled', async () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(false)

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  })

  test('should return true when stars align', () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(true)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  })
})
