import { SUPPORTABILITY_METRIC_CHANNEL } from '../../../../src/features/metrics/constants'
import { reportSupportabilityMetric } from '../../../../src/features/utils/supportability-metrics'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { ee } from '../../../../src/common/event-emitter/contextual-ee'

const agentIdentifier = 'abcd'
const name = 'testName'
const value = 123
let instanceEE
describe('supportability-metrics', () => {
  beforeEach(async () => {
    jest.spyOn(handleModule, 'handle')
    instanceEE = ee.get(agentIdentifier)
    jest.spyOn(instanceEE, 'emit')
  })
  test('should handle supportability metric with name', async () => {
    expect(reportSupportabilityMetric({ name }, agentIdentifier))
    expect(handleModule.handle).toHaveBeenCalledWith(
      SUPPORTABILITY_METRIC_CHANNEL,
      [name],
      undefined,
      FEATURE_NAMES.metrics,
      instanceEE
    )
  })

  test('should handle supportability metric with name and value', async () => {
    expect(reportSupportabilityMetric({ name, value }, agentIdentifier))
    expect(handleModule.handle).toHaveBeenCalledWith(
      SUPPORTABILITY_METRIC_CHANNEL,
      [name, value],
      undefined,
      FEATURE_NAMES.metrics,
      instanceEE
    )
  })

  test('should not handle if no name', async () => {
    expect(reportSupportabilityMetric({ name: undefined }, agentIdentifier))
    expect(handleModule.handle).not.toHaveBeenCalled()
  })
})
