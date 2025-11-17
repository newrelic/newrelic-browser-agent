import { evaluateHarvestMetadata } from '../../src/features/metrics/aggregate/harvest-metadata'

describe('evaluateHarvestMetadata', () => {
  it('returns SR false positive when hasReplay true but no replay harvest', () => {
    const meta = { page_view_event: { hasReplay: true } }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining(['audit/page_view/hasReplay/false/positive']))
  })

  it('returns SR false negative when hasReplay false but replay harvest occurred', () => {
    const meta = { page_view_event: { hasReplay: false }, session_replay: {} }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining(['audit/page_view/hasReplay/false/negative']))
  })

  it('returns ST false positive when hasTrace true but no trace harvest', () => {
    const meta = { page_view_event: { hasTrace: true } }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining(['audit/page_view/hasTrace/false/positive']))
  })

  it('returns ST false negative when hasTrace false but trace harvest occurred', () => {
    const meta = { page_view_event: { hasTrace: false }, session_trace: {} }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining(['audit/page_view/hasTrace/false/negative']))
  })

  it('returns SR event error false positive when SR harvest hasError true but no error harvest', () => {
    const meta = { session_replay: { hasError: true } }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining(['audit/session_replay/hasError/false/positive']))
  })

  it('returns SR event error false negative when error harvested during active SR but no SR harvest with hasError true', () => {
    const meta = { session_replay: { hasError: false }, jserrors: { } }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining(['audit/session_replay/hasError/false/negative']))
  })

  it('returns positive tags when all conditions are normal', () => {
    const meta = { page_view_event: { hasReplay: true, hasTrace: true }, session_replay: { }, session_trace: { } }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining([
      'audit/page_view/hasReplay/true/positive',
      'audit/page_view/hasTrace/true/positive',
      'audit/session_replay/hasError/true/negative'
    ]))
  })

  it('returns true negative tags when all features are correctly absent', () => {
    const meta = { page_view_event: { hasReplay: false, hasTrace: false } }
    expect(evaluateHarvestMetadata(meta)).toEqual(expect.arrayContaining([
      'audit/page_view/hasReplay/true/negative',
      'audit/page_view/hasTrace/true/negative'
    ]))
  })

  it('returns multiple tags if multiple conditions are met', () => {
    const meta = { page_view_event: { hasReplay: true, hasTrace: false }, session_trace: { } }
    const tags = evaluateHarvestMetadata(meta)
    expect(tags).toEqual(expect.arrayContaining([
      'audit/page_view/hasReplay/false/positive',
      'audit/page_view/hasTrace/false/negative'
    ]))
  })

  it('handles errors', () => {
    const meta = {}
    Object.defineProperty(meta, 'page_view_event', {
      get () {
        throw new Error('Test error accessing page_view_event')
      }
    })
    expect(evaluateHarvestMetadata(meta)).toEqual([])
  })
})
