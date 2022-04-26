/**
 * @jest-environment jsdom
 */
import 'babel-polyfill'
const { NrFeatures } = require('../../types')

describe('API', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('should set the exposed API method to the imported API method', async function() {
    const apiDefaults = await import('./api')
    const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
    await apiDefaults.initialize([NrFeatures.JSERRORS])
    expect(apiDefaults.api.storeError).toEqual(jsErrors.storeError)
  })
})
