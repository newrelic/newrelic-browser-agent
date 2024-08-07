import { faker } from '@faker-js/faker'
import * as runtimeConstantsModule from '../../../../src/common/constants/runtime'
import * as configModule from '../../../../src/common/config/config'
import { canEnableSessionTracking } from '../../../../src/features/utils/feature-gates'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/feature-gates')

let agentIdentifier
let originalPerformanceNavigationTiming

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
  originalPerformanceNavigationTiming = global.PerformanceNavigationTiming
})

afterEach(() => {
  global.PerformanceNavigationTiming = originalPerformanceNavigationTiming
})

describe('enableSessionTracking', () => {
  test('should return false when not browser scope', async () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', false)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
    global.PerformanceNavigationTiming = jest.fn()

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).not.toHaveBeenCalled()
  })

  test('should return false when session tracking disabled', async () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(false)
    global.PerformanceNavigationTiming = jest.fn()

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  })

  test('should return false when PerformanceNavigationTiming API is undefined', () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
    global.PerformanceNavigationTiming = undefined

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(false)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  })

  test('should return true when stars align', () => {
    jest.replaceProperty(runtimeConstantsModule, 'isBrowserScope', true)
    jest.mocked(configModule.getConfigurationValue).mockReturnValue(true)
    global.PerformanceNavigationTiming = jest.fn()

    expect(canEnableSessionTracking(agentIdentifier)).toEqual(true)
    expect(configModule.getConfigurationValue).toHaveBeenCalledWith(agentIdentifier, 'privacy.cookies_enabled')
  })
})
