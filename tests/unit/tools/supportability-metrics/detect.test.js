const { initSettings, featureFlags, detectChanges, loadParser } = require('../../../../tools/supportability-metrics/detect')

const parser = loadParser()

const initCode = (model) => `
const hiddenState = { feature_flags: [], experimental: { register: false } }
const InitModelFn = () => {
  return ${model}
}
export const mergeInit = (init) => init
`

describe('initSettings', () => {
  test('lists nested settings with their kind: booleans report Enabled, everything else Changed', () => {
    const settings = initSettings(initCode(`{
      ajax: { enabled: true, deny_list: undefined, limit: 5 },
      proxy: { assets: undefined },
      harvest: { interval: 30 },
      session_replay: { collect_fonts: false, block_selector: '[data-nr-block]' },
      obfuscate: undefined
    }`), parser)

    expect(Object.fromEntries(settings)).toEqual({
      'ajax/enabled': 'boolean',
      'ajax/deny_list': 'other',
      'ajax/limit': 'other',
      'proxy/assets': 'other',
      'harvest/interval': 'other',
      'session_replay/collect_fonts': 'boolean',
      'session_replay/block_selector': 'other',
      obfuscate: 'other'
    })
  })

  test('treats a getter that checks the feature flags as a boolean, and any other getter as not', () => {
    const settings = initSettings(initCode(`{
      api: { register: {
        get enabled () { return hiddenState.feature_flags.includes('register') || hiddenState.experimental.register },
        set enabled (val) { hiddenState.experimental.register = val },
        get block_class () { return 'nr-block' }
      } }
    }`), parser)

    expect(Object.fromEntries(settings)).toEqual({ 'api/register/enabled': 'boolean', 'api/register/block_class': 'other' })
  })

  test('does not list feature_flags, which are reported by name', () => {
    const settings = initSettings(initCode('{ feature_flags: [], ajax: { enabled: true } }'), parser)

    expect([...settings.keys()]).toEqual(['ajax/enabled'])
  })

  test('returns nothing when the file has no config model', () => {
    expect(initSettings('export const x = 1', parser).size).toBe(0)
  })
})

describe('featureFlags', () => {
  test('finds string literals checked against feature_flags, including through optional chaining', () => {
    const flags = featureFlags(`
      if (agentRef.init.feature_flags.includes('rum_v2')) {}
      const x = this.agentRef.init.feature_flags?.includes('ajax_metrics_deny_list')
      other.includes('not_a_flag')
      hiddenState.feature_flags.includes(SOMETHING)
    `, parser)

    expect([...flags].sort()).toEqual(['ajax_metrics_deny_list', 'rum_v2'])
  })

  test('finds the values of a FEATURE_FLAGS constant', () => {
    expect([...featureFlags("export const FEATURE_FLAGS = { RESOURCES: 'experimental.resources', REGISTER: 'register' }", parser)].sort()).toEqual(['experimental.resources', 'register'])
  })

  test('ignores a dynamic flag name', () => {
    expect(featureFlags("a.feature_flags.includes('register.' + name)", parser).size).toBe(0)
  })
})

describe('detectChanges', () => {
  const files = { base: {}, head: {} }
  const readers = { readBase: (file) => files.base[file], readHead: (file) => files.head[file] }
  beforeEach(() => { files.base = {}; files.head = {} })

  test('reports a feature flag that the change starts to check', () => {
    files.base['src/a.js'] = "x.feature_flags.includes('old_flag')"
    files.head['src/a.js'] = "x.feature_flags.includes('old_flag'); x.feature_flags.includes('new_flag')"

    expect(detectChanges({ files: ['src/a.js'], ...readers }).addedFlags).toEqual(['new_flag'])
  })

  test('reports the flags of a file that is new', () => {
    files.head['src/new.js'] = "x.feature_flags.includes('brand_new')"

    expect(detectChanges({ files: ['src/new.js'], ...readers }).addedFlags).toEqual(['brand_new'])
  })

  test('does not report a flag that was already checked in that file', () => {
    files.base['src/a.js'] = files.head['src/a.js'] = "x.feature_flags.includes('same')"

    expect(detectChanges({ files: ['src/a.js'], ...readers }).addedFlags).toEqual([])
  })

  test('reports added and removed init settings with the metric name the agent reports for each', () => {
    files.base['src/common/config/init.js'] = initCode('{ ajax: { enabled: true }, legacy: { on: true } }')
    files.head['src/common/config/init.js'] = initCode('{ ajax: { enabled: true, capture: false, limit: 5 } }')

    const result = detectChanges({ files: ['src/common/config/init.js'], ...readers })

    expect(result.addedSettings).toEqual([
      { path: 'ajax.capture', tag: 'Config/ajax/capture/Enabled' },
      { path: 'ajax.limit', tag: 'Config/ajax/limit/Changed' }
    ])
    expect(result.removedSettings).toEqual([{ path: 'legacy.on', tag: 'Config/legacy/on/Enabled' }])
  })

  test('reports a setting whose kind changed, because the metric name it reports changes', () => {
    files.base['src/common/config/init.js'] = initCode('{ ajax: { limit: true } }')
    files.head['src/common/config/init.js'] = initCode('{ ajax: { limit: 5 } }')

    expect(detectChanges({ files: ['src/common/config/init.js'], ...readers }).addedSettings).toEqual([{ path: 'ajax.limit', tag: 'Config/ajax/limit/Changed' }])
  })

  test('reports no settings when init.js was not changed', () => {
    files.head['src/a.js'] = 'const a = 1'

    expect(detectChanges({ files: ['src/a.js'], ...readers })).toEqual({ addedSettings: [], removedSettings: [], addedFlags: [] })
  })

  test('returns undefined, meaning "cannot tell", when a file cannot be parsed', () => {
    files.head['src/a.js'] = 'this is ( not valid javascript'

    expect(detectChanges({ files: ['src/a.js'], ...readers })).toBeUndefined()
  })

  test('returns undefined when the parser is not installed, instead of throwing', () => {
    jest.isolateModules(() => {
      jest.doMock('acorn', () => { throw new Error('not installed') })
      const isolated = require('../../../../tools/supportability-metrics/detect')

      expect(isolated.detectChanges({ files: ['src/a.js'], ...readers })).toBeUndefined()
    })
  })
})
