import { resetAgent, setupAgent } from './setup-agent'

let mainAgent

beforeAll(() => {
  mainAgent = setupAgent({
    init: {
      useConsentModel: true
    }
  })
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

describe('Consent model', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor')
  })

  test('does not harvest if consent model is enabled and consent not given', async () => {
    const fakeAggregate = {
      makeHarvestPayload: jest.fn().mockReturnValue([{ targetApp: 'someApp', payload: 'fakePayload' }]),
      postHarvestCleanup: () => {},
      harvestOpts: {}
    }

    mainAgent.runtime.harvester.triggerHarvestFor(fakeAggregate, { })

    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(1)
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveReturnedWith(false)
  })

  test('harvests if consent model is enabled and consent is given', async () => {
    const fakeAggregate = {
      makeHarvestPayload: jest.fn().mockReturnValue([{ targetApp: 'someApp', payload: 'fakePayload' }]),
      postHarvestCleanup: () => {},
      harvestOpts: {}
    }
    localStorage.setItem('NrBrowserAgentConsent', 'true')

    mainAgent.runtime.harvester.triggerHarvestFor(fakeAggregate, { })

    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(1)
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveReturnedWith(true)
  })
})
