import { AggregatedUserAction } from '../../../../../../src/features/generic_events/aggregate/user-actions/aggregated-user-action'
import { UserActionsAggregator } from '../../../../../../src/features/generic_events/aggregate/user-actions/user-actions-aggregator'

describe('UserActionsAggregator', () => {
  let aggregator

  beforeEach(() => {
    aggregator = new UserActionsAggregator()
  })

  test('should initialize with default values', () => {
    expect(aggregator).toBeInstanceOf(UserActionsAggregator)
  })

  test('should process events and aggregate correctly, and emit to subscribers', () => {
    const evt = { type: 'click', target: document }

    const doneFn = jest.fn()
    aggregator.on('aggregation-complete', doneFn)
    aggregator.process(evt)

    aggregator.storeCurrentUserActionInFeature()
    expect(doneFn).toHaveBeenCalledWith(new AggregatedUserAction(evt, 'document'))
  })

  test('getSelectorPath should return correct selector path', () => {
    const button = document.createElement('button')
    button.id = 'my-button'
    document.body.appendChild(button)
    const windowEvt = { type: 'click', target: window }
    const documentEvt = { type: 'click', target: document }
    const domEvt = { type: 'click', target: button }
    const undefinedEvt = { type: 'click', target: undefined }

    const checks = ['window', 'document', 'html>body>button#my-button:nth-of-type(1)', 'undefined']

    aggregator.on('aggregation-complete', (userActionEvent) => {
      expect(userActionEvent.selectorPath).toBe(checks.shift())
    })

    aggregator.process(windowEvt)
    aggregator.process(documentEvt)
    aggregator.process(domEvt)
    aggregator.process(undefinedEvt)
  })

  test('should aggregate when matching, end aggregation when not', () => {
    const button = document.createElement('button')
    button.id = 'my-button'
    document.body.prepend(button)
    const windowEvt = { type: 'click', target: window }
    const documentEvt = { type: 'click', target: document }
    const domEvt = { type: 'click', target: button }
    const undefinedEvt = { type: 'click', target: undefined }

    const typeChecks = ['window', 'document', 'html>body>button#my-button:nth-of-type(1)', 'undefined']
    const aggregationChecks = [3, 2, 4, 1]
    aggregator.on('aggregation-complete', (userActionEvent) => {
      expect(userActionEvent.selectorPath).toBe(typeChecks.shift())
      expect(userActionEvent.count).toBe(aggregationChecks.shift())
    })

    aggregator.process(windowEvt)
    aggregator.process(windowEvt)
    aggregator.process(windowEvt)
    aggregator.process(documentEvt)
    aggregator.process(documentEvt)
    aggregator.process(domEvt)
    aggregator.process(domEvt)
    aggregator.process(domEvt)
    aggregator.process(domEvt)
    aggregator.process(undefinedEvt)
  })
})
