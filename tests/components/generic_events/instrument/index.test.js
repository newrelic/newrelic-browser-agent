import { TimeKeeper } from '../../../../src/common/timing/time-keeper'
import { configure } from '../../../../src/loaders/configure/configure'
import { setRuntime } from '../../../../src/common/config/config'
import { ee } from '../../../../src/common/event-emitter/contextual-ee'
import { Aggregator } from '../../../../src/common/aggregate/aggregator'

let timeKeeper, genericEventsInst
const agentId = 'abcd'
describe('Generic Events instrument', () => {
  beforeEach(async () => {
    const agent = { agentIdentifier: agentId }
    configure(agent, {
      info: { licenseKey: 'licenseKey', applicationID: 'applicationID' },
      runtime: { isolatedBacklog: false },
      init: {}
    }, 'test', true)

    timeKeeper = new TimeKeeper(agentId, ee.get(agentId))
    timeKeeper.processRumRequest({
      getResponseHeader: jest.fn(() => (new Date()).toUTCString())
    }, 450, 600)
    setRuntime(agentId, { timeKeeper })

    const { Instrument } = await import('../../../../src/features/generic_events/instrument')

    genericEventsInst = new Instrument(agentId, new Aggregator({ agentIdentifier: agentId, ee }))
  })

  it('should import if event source is enabled', async () => {
    await wait(100)
    expect(genericEventsInst.onAggregateImported).not.toBeUndefined()
  })
  it('should not import if event source is not enabled', async () => {
    const agent = { agentIdentifier: agentId }
    configure(agent, {
      info: { licenseKey: 'licenseKey', applicationID: 'applicationID' },
      runtime: { isolatedBacklog: false },
      init: { page_action: { enabled: false } }
    }, 'test', true)
    const { Instrument } = await import('../../../../src/features/generic_events/instrument')
    genericEventsInst = new Instrument(agentId, new Aggregator({ agentIdentifier: agentId, ee }))
    await wait(100)
    expect(genericEventsInst.onAggregateImported).toBeUndefined()
  })
})

function wait (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}
