import { runRegisteredEntityTest } from './test-helpers'

describe('Base', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('without register', async () => {
    await runRegisteredEntityTest([])
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register'])
  })
})
