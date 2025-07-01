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

  test('should process events and return the prior event when done', () => {
    const evt = { type: 'test', target: document }
    const evt2 = { type: 'test2', target: document }

    expect(aggregator.process(evt)).toBeUndefined()

    const output = aggregator.process(evt2)
    expect(output).toBeInstanceOf(AggregatedUserAction)
    expect(output.events[0]).toEqual(evt) // not evt2, it returns the processed event (evt)
    expect(output.count).toEqual(1)
  })

  test('should process events and return correct selector path', () => {
    const button = document.createElement('button')
    button.id = 'my-button'
    document.body.appendChild(button)
    const windowEvt = { type: 'click', target: window }
    const documentEvt = { type: 'click', target: document }
    const domEvt = { type: 'click', target: button }
    const undefinedEvt = { type: 'click', target: undefined }

    const shouldBeUndefined = aggregator.process(windowEvt)
    const shouldBeWindowEvt = aggregator.process(documentEvt)
    const shouldBeDocumentEvt = aggregator.process(domEvt)
    const shouldBeDomEvt = aggregator.process(undefinedEvt)
    const shouldBeUndefinedEvt = aggregator.process()

    expect(shouldBeUndefined).toBeUndefined()
    expect(shouldBeWindowEvt.selectorPath).toEqual('window')
    expect(shouldBeDocumentEvt.selectorPath).toEqual('document')
    expect(shouldBeDomEvt.selectorPath).toEqual('html>body>button#my-button:nth-of-type(1)')
    expect(shouldBeUndefinedEvt).toBeUndefined()
  })

  test('should aggregate when matching, end aggregation when not', () => {
    const textarea = document.createElement('textarea')
    textarea.id = 'my-text-area'
    document.body.prepend(textarea)
    const windowEvt = { type: 'click', target: window }
    const documentEvt = { type: 'click', target: document }
    const domClickEvt = { type: 'click', target: textarea }
    const domKeydownEvt = { type: 'keydown', target: textarea }
    const undefinedEvt = { type: 'click', target: undefined }

    expect(aggregator.process(windowEvt)).toBeUndefined()
    expect(aggregator.process(windowEvt)).toBeUndefined()
    expect(aggregator.process(windowEvt)).toBeUndefined()
    /** aggregation should stop since a new evt -target- was observed */
    expect(aggregator.process(documentEvt)).toMatchObject({ count: 3, selectorPath: 'window' })
    expect(aggregator.process(documentEvt)).toBeUndefined()
    /** aggregation should stop since a new evt -target- was observed */
    expect(aggregator.process(domClickEvt)).toMatchObject({ count: 2, selectorPath: 'document' })
    expect(aggregator.process(domClickEvt)).toBeUndefined()
    expect(aggregator.process(domClickEvt)).toBeUndefined()
    expect(aggregator.process(domClickEvt)).toBeUndefined()
    /** aggregation should stop since a new evt -type- was observed */
    expect(aggregator.process(domKeydownEvt)).toMatchObject({ count: 4, selectorPath: 'html>body>textarea#my-text-area:nth-of-type(1)' })
    /** aggregation should stop since a new evt -target- was observed and undefined are not aggregated */
    expect(aggregator.process(undefinedEvt)).toMatchObject({ count: 1, selectorPath: 'html>body>textarea#my-text-area:nth-of-type(1)' })
    /** aggregation should stop since a new evt -target- was observed and undefined are not aggregated */
    expect(aggregator.process(undefinedEvt)).toBeUndefined()
  })
})
