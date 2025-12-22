import { runRegisteredEntityTest } from './test-helpers'

describe('Generic Events', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register', 'register.generic_events'])
  })

  it('without register', async () => {
    await runRegisteredEntityTest(['register.generic_events'])
  })
})
