import { runRegisteredEntityTest } from './test-helpers'

describe('JS Errors + Generic Events', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register', 'register.jserrors', 'register.generic_events'])
  })

  it('without register', async () => {
    await runRegisteredEntityTest(['register.jserrors', 'register.generic_events'])
  })
})
