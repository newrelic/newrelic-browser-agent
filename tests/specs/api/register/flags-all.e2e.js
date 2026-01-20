import { runRegisteredEntityTest } from './test-helpers'

describe('All Features', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register', 'register.jserrors', 'register.generic_events', 'register.ajax'])
  })

  it('without register', async () => {
    await runRegisteredEntityTest(['register.jserrors', 'register.generic_events', 'register.ajax'])
  })
})
