jest.mock('../../../../src/common/util/console.js')

let getConfiguration, setConfiguration, getConfigurationValue
beforeEach(async () => {
  jest.resetModules()
  ;({ getConfiguration, setConfiguration, getConfigurationValue } = await import('../../../../src/common/config/init.js'))
})

test('set/getConfiguration should throw on an invalid agent id', () => {
  // currently only checks if it's a truthy value
  expect(() => setConfiguration(undefined, {})).toThrow('require an agent id')
  expect(() => getConfiguration(undefined)).toThrow('require an agent id')
  expect(() => setConfiguration('', {})).toThrow('require an agent id')
  expect(() => getConfiguration('')).toThrow('require an agent id')
})

test('set/getConfiguration works correctly', () => {
  expect(() => setConfiguration(123, { jserrors: { enabled: false } })).not.toThrow() // notice setConfiguration accepts numbers
  let cachedObj = getConfiguration('123')
  expect(Object.keys(cachedObj).length).toBeGreaterThan(1)
  expect(cachedObj.jserrors.enabled).toEqual(false)
  expect(cachedObj.generic_events.enabled).toEqual(true) // this should mirror default in init.js
})

test('getConfigurationValue parses path correctly', () => {
  setConfiguration('ab', { generic_events: { harvestTimeSeconds: 1000 } })
  expect(getConfigurationValue('ab', '')).toBeUndefined()
  expect(getConfigurationValue('ab', 'generic_events')).toEqual({ enabled: true, harvestTimeSeconds: 1000, autoStart: true })
  expect(getConfigurationValue('ab', 'generic_events.harvestTimeSeconds')).toEqual(1000)
  expect(getConfigurationValue('ab', 'generic_events.dne')).toBeUndefined()
})

test('init props exist and return expected defaults', () => {
  setConfiguration('34567', {})
  const config = getConfiguration('34567')
  expect(Object.keys(config).length).toEqual(22)
  expect(config.ajax).toEqual({
    autoStart: true,
    block_internal: true,
    deny_list: undefined,
    enabled: true,
    harvestTimeSeconds: 10
  })
  expect(config.distributed_tracing).toEqual({
    allowed_origins: undefined,
    cors_use_newrelic_header: undefined,
    cors_use_tracecontext_headers: undefined,
    enabled: undefined,
    exclude_newrelic_header: undefined
  })
  expect(config.generic_events).toEqual({
    autoStart: true,
    enabled: true,
    harvestTimeSeconds: 30
  })
  expect(config.feature_flags).toEqual([])
  expect(config.harvest).toEqual({
    tooManyRequestsDelay: 60,
    interval: 30
  })
  expect(config.jserrors).toEqual({
    autoStart: true,
    enabled: true,
    harvestTimeSeconds: 10
  })
  expect(config.logging).toEqual({
    autoStart: true,
    enabled: true,
    harvestTimeSeconds: 10,
    level: 'INFO'
  })
  expect(config.metrics).toEqual({
    autoStart: true,
    enabled: true
  })
  expect(config.obfuscate).toEqual(undefined)
  expect(config.page_action).toEqual({
    enabled: true
  })
  expect(config.user_actions).toEqual({
    enabled: true
  })
  expect(config.page_view_event).toEqual({
    autoStart: true,
    enabled: true
  })
  expect(config.page_view_timing).toEqual({
    autoStart: true,
    enabled: true,
    harvestTimeSeconds: 30
  })
  expect(config.performance).toEqual({
    capture_marks: false,
    capture_measures: false,
    resources: {
      enabled: false,
      asset_types: [],
      first_party_domains: [],
      ignore_newrelic: true
    }
  })
  expect(config.privacy).toEqual({
    cookies_enabled: true
  })
  expect(config.proxy).toEqual({
    assets: undefined,
    beacon: undefined
  })
  expect(config.session).toEqual({
    expiresMs: 14400000,
    inactiveMs: 1800000
  })
  expect(config.session_replay).toEqual({
    autoStart: true,
    block_class: 'nr-block',
    block_selector: '[data-nr-block]',
    collect_fonts: false,
    enabled: false,
    error_sampling_rate: 100,
    fix_stylesheets: true,
    harvestTimeSeconds: 60,
    ignore_class: 'nr-ignore',
    inline_images: false,
    mask_all_inputs: true,
    mask_input_options: {
      color: false,
      date: false,
      'datetime-local': false,
      email: false,
      month: false,
      number: false,
      password: true,
      range: false,
      search: false,
      select: false,
      tel: false,
      text: false,
      textarea: false,
      time: false,
      url: false,
      week: false
    },
    mask_text_class: 'nr-mask',
    mask_text_selector: '*',
    preload: false,
    sampling_rate: 10
  })
  expect(config.session_trace).toEqual({
    autoStart: true,
    enabled: true,
    harvestTimeSeconds: 10
  })
  expect(config.soft_navigations).toEqual({
    autoStart: true,
    enabled: true,
    harvestTimeSeconds: 10
  })
  expect(config.spa).toEqual({
    autoStart: true,
    enabled: true,
    harvestTimeSeconds: 10
  })
  expect(config.ssl).toEqual(undefined)
  expect(config.user_actions).toEqual({
    enabled: true
  })
})

describe('property getters/setters used for validation', () => {
  test('invalid values do not pass through', () => {
    setConfiguration('12345', {
      session_replay: {
        block_selector: '[invalid selector]',
        mask_text_selector: '[invalid selector]',
        mask_input_options: 'select:true'
      }
    })

    expect(getConfigurationValue('12345', 'session_replay.block_selector')).toEqual('[data-nr-block]')
    expect(getConfigurationValue('12345', 'session_replay.mask_text_selector')).toEqual('*')
    expect(getConfigurationValue('12345', 'session_replay.mask_input_options')).toMatchObject({ password: true, select: false })
  })

  test('valid values do pass through', () => {
    setConfiguration('23456', {
      session_replay: {
        block_selector: '[block-text-test]',
        mask_text_selector: '[mask-text-test]',
        mask_input_options: { select: true }
      }
    })

    expect(getConfigurationValue('23456', 'session_replay.block_selector')).toEqual('[data-nr-block],[block-text-test]')
    expect(getConfigurationValue('23456', 'session_replay.mask_text_selector')).toEqual('[mask-text-test],[data-nr-mask]')
    expect(getConfigurationValue('23456', 'session_replay.mask_input_options')).toMatchObject({ password: true, select: true })
  })

  test('null accepted for mask_text', () => {
    setConfiguration('34567', {
      session_replay: {
        mask_text_selector: null
      }
    })

    expect(getConfigurationValue('34567', 'session_replay.mask_text_selector')).toEqual('[data-nr-mask]')
  })

  test('empty string accepted for mask_text', () => {
    setConfiguration('34567', {
      session_replay: {
        mask_text_selector: ''
      }
    })

    expect(getConfigurationValue('34567', 'session_replay.mask_text_selector')).toEqual('[data-nr-mask]')
  })

  test('props without a setter does not issue on attempted assignment', () => {
    setConfiguration('34567', {
      session_replay: {
        block_class: undefined,
        ignore_class: null,
        mask_text_class: '',
        mask_input_options: { select: true }
      }
    })

    expect(getConfigurationValue('34567', 'session_replay.block_class')).toEqual('nr-block')
    expect(getConfigurationValue('34567', 'session_replay.ignore_class')).toEqual('nr-ignore')
    expect(getConfigurationValue('34567', 'session_replay.mask_text_class')).toEqual('nr-mask')
    expect(getConfigurationValue('34567', 'session_replay.mask_input_options')).toMatchObject({ password: true, select: true })
  })
})
