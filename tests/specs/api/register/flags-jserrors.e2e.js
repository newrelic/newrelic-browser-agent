import { runRegisteredEntityTest } from './test-helpers'

describe('JS Errors', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register', 'register.jserrors'])
  })

  it('without register', async () => {
    await runRegisteredEntityTest(['register.jserrors'])
  })
})
