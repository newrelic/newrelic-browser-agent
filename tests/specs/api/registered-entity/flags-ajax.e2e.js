import { runRegisteredEntityTest } from './test-helpers'

describe('AJAX', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register', 'register.ajax'])
  })

  it('without register', async () => {
    await runRegisteredEntityTest(['register.ajax'])
  })
})
