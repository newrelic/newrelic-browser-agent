import { reportSupportabilityMetric } from '../../../../src/common/event-emitter/report-supportability-metric'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'

jest.mock('../../../../src/common/event-emitter/handle')

const ee = { mock: 'ee' }

test('emits the metric name alone on the supportability channel to the metrics feature', () => {
  reportSupportabilityMetric(ee, 'Some/Metric')

  expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Some/Metric'], undefined, FEATURE_NAMES.metrics, ee)
})

test('emits the metric name with its value', () => {
  reportSupportabilityMetric(ee, 'Some/Metric', 42)

  expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Some/Metric', 42], undefined, FEATURE_NAMES.metrics, ee)
})
