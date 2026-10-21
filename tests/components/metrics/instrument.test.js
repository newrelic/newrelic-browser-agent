import { setupAgent } from '../setup-agent'
import { Instrument as Metrics } from '../../../src/features/metrics/instrument'
import { warn } from '../../../src/common/util/console'
import { dispatchGlobalEvent } from '../../../src/common/dispatch/global-event'

let agent, emit

beforeAll(async () => {
  agent = setupAgent()
  jest.spyOn(console, 'debug').mockImplementation(() => {})
  new Metrics(agent) // eslint-disable-line no-new
  await new Promise(process.nextTick)
})

beforeEach(() => {
  emit = jest.spyOn(agent.ee, 'emit')
  emit.mockClear()
})

const warnings = () => emit.mock.calls.filter(([type, [name]]) => type === 'storeSupportabilityMetrics' && String(name).startsWith('Warn/'))
const fakeWarning = (code) => dispatchGlobalEvent({ name: 'warn', feature: 'warn', data: { code } })

describe('the metrics instrument counts warnings', () => {
  test('reports Warn/<code>/Seen each time the agent warns', () => {
    warn(16)
    warn(16)
    warn(35, 'addPageAction')

    expect(warnings().map(([, [name]]) => name)).toEqual(['Warn/16/Seen', 'Warn/16/Seen', 'Warn/35/Seen'])
  })

  test('never reports the warning\'s secondary argument, which can hold customer data', () => {
    warn(5, '#secret-selector')

    expect(JSON.stringify(warnings())).not.toContain('secret')
  })

  test('counts a warning once, however many tests ran before', () => {
    warn(42)

    expect(warnings()).toHaveLength(1)
  })

  test('ignores global events that are not warnings', () => {
    dispatchGlobalEvent({ name: 'loaded', data: { code: 1 } })
    dispatchGlobalEvent({ loaded: true })
    dispatchGlobalEvent()

    expect(warnings()).toEqual([])
  })

  test('ignores a warning event that has no code', () => {
    ;[undefined, null, 0, ''].forEach(fakeWarning)

    expect(warnings()).toEqual([])
  })
})
