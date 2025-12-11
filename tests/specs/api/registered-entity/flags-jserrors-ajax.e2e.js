import { runRegisteredEntityTest } from './test-helpers'

describe('JS Errors + AJAX', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register', 'register.jserrors', 'register.ajax'])
  })

  it('without register', async () => {
    await runRegisteredEntityTest(['register.jserrors', 'register.ajax'])
  })
})
