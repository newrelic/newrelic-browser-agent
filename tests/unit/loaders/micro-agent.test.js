import { MicroAgent } from '../../../src/loaders/micro-agent'
import { ee } from '../../../src/common/event-emitter/contextual-ee'

const options = () => ({ info: { licenseKey: 'license', applicationID: 'app-id', beacon: 'bam.nr-data.net', errorBeacon: 'bam.nr-data.net' }, init: {} })

test('has an event emitter of its own, which every feature reads', () => {
  const agent = new MicroAgent(options())

  expect(agent.ee).toBe(ee.get(agent.agentIdentifier))
})

test('gets an emitter with an isolated backlog, so its events do not leak to other agents', () => {
  expect(new MicroAgent(options()).ee.isolatedBacklog).toBe(true)
})
