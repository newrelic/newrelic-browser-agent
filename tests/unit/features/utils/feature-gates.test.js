import { faker } from '@faker-js/faker'
import * as runtimeConstantsModule from '../../../../src/common/constants/runtime'
import * as initModule from '../../../../src/common/config/init'
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
    jest.mocked(initModule.getConfigurationValue).mockReturnValue(true)

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(false)
    expect(initModule.getConfigurationValue).not.toHaveBeenCalled()
  })

  test('should return false when session tracking disabled', async () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(initModule.getConfigurationValue).mockReturnValue(false)

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(false)
    expect(initModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  })

  test('should return true when stars align', () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(initModule.getConfigurationValue).mockReturnValue(true)

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(true)
    expect(initModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  })
})
