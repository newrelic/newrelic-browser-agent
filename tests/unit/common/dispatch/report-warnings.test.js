import { reportWarnings } from '../../../../src/common/dispatch/report-warnings'
import { dispatchGlobalEvent } from '../../../../src/common/dispatch/global-event'
import { reportSupportabilityMetric } from '../../../../src/common/event-emitter/report-supportability-metric'

jest.mock('../../../../src/common/event-emitter/report-supportability-metric')

const ee = { fake: 'emitter' }
const warning = (code, secondary) => dispatchGlobalEvent({ drained: null, type: 'data', name: 'warn', feature: 'warn', data: { code, secondary } })
let stop

beforeEach(() => { stop = reportWarnings(ee) })
afterEach(() => {
  stop()
  jest.clearAllMocks()
})

test('reports a Warn/<code>/Seen metric on the emitter for each warning', () => {
  warning(42)

  expect(reportSupportabilityMetric).toHaveBeenCalledTimes(1)
  expect(reportSupportabilityMetric).toHaveBeenCalledWith(ee, 'Warn/42/Seen')
})

test('reports every occurrence, not just the first', () => {
  warning(16)
  warning(16)
  warning(16)

  expect(reportSupportabilityMetric).toHaveBeenCalledTimes(3)
})

test('never reports the warning\'s secondary argument, which can hold customer data', () => {
  warning(5, '#secret-selector')

  expect(JSON.stringify(reportSupportabilityMetric.mock.calls)).not.toContain('secret')
})

test('ignores global events that are not warnings', () => {
  dispatchGlobalEvent({ name: 'loaded', feature: 'loaded', data: { code: 1 } })
  dispatchGlobalEvent({ loaded: true })
  dispatchGlobalEvent()

  expect(reportSupportabilityMetric).not.toHaveBeenCalled()
})

test('ignores a code that is not a plain number, because the global event is public and the code becomes part of a metric name', () => {
  ;['abc', '1/2', 12345, -1, 1.5, '', undefined, null, { toString: () => '7' }].forEach(code => warning(code))

  expect(reportSupportabilityMetric).not.toHaveBeenCalled()
})

test('does not report while it is told the metrics are off, and reports again when they are back on', () => {
  stop()
  let enabled = false
  stop = reportWarnings(ee, () => enabled)

  warning(42)
  expect(reportSupportabilityMetric).not.toHaveBeenCalled()

  enabled = true
  warning(42)
  expect(reportSupportabilityMetric).toHaveBeenCalledTimes(1)
})

test('stops reporting once stopped', () => {
  stop()
  warning(42)

  expect(reportSupportabilityMetric).not.toHaveBeenCalled()
})
