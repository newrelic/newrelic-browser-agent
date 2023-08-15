import { setAPI } from './api'
import { setInfo, getInfo, setConfiguration } from '../../common/config/config'

setInfo('abcd', { licenseKey: '1234', applicationID: '1234' })
setConfiguration('abcd', {})
let apiInterface
beforeEach(() => {
  console.warn = jest.fn()
  apiInterface = setAPI('abcd', true)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('api', () => {
  describe('setApplicationVersion', () => {
    test('setApplicationVersion sets and unsets ja with valid values', () => {
      apiInterface.setApplicationVersion('1.2.3')
      expect(getInfo('abcd').jsAttributes).toMatchObject({ 'application.version': '1.2.3' })

      apiInterface.setApplicationVersion(null)
      expect(getInfo('abcd').jsAttributes).toMatchObject({ })
    })

    test('setApplicationVersion warns if invalid data is supplied', () => {
      apiInterface.setApplicationVersion(1)
      expect(console.warn).toHaveBeenCalledWith('New Relic: Failed to execute setApplicationVersion. Expected <String | null>, but got <number>.')

      apiInterface.setApplicationVersion(false)
      expect(console.warn).toHaveBeenCalledWith('New Relic: Failed to execute setApplicationVersion. Expected <String | null>, but got <boolean>.')

      apiInterface.setApplicationVersion({ version: '1.2.3' })
      expect(console.warn).toHaveBeenCalledWith('New Relic: Failed to execute setApplicationVersion. Expected <String | null>, but got <object>.')
    })

    test('setApplicationVersion replaces existing data if called twice', () => {
      apiInterface.setApplicationVersion('1.2.3')
      expect(getInfo('abcd').jsAttributes).toMatchObject({ 'application.version': '1.2.3' })

      apiInterface.setApplicationVersion('4.5.6')
      expect(getInfo('abcd').jsAttributes).toMatchObject({ 'application.version': '4.5.6' })
    })
  })
})
