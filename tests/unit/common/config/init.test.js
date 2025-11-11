import { mergeInit } from '../../../../src/common/config/init.js'

jest.mock('../../../../src/common/util/console.js')

test('init props exist and return expected defaults', () => {
  const config = mergeInit({})
  expect(Object.keys(config).length).toEqual(24)
  expect(config.ajax).toEqual({
    autoStart: true,
    block_internal: true,
    deny_list: undefined,
    enabled: true
  })
  expect(config.api).toEqual({
    allow_registered_children: false,
    duplicate_registered_data: false
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
    enabled: true
  })
  expect(config.feature_flags).toEqual([])
  expect(config.harvest).toEqual({
    interval: 30
  })
  expect(config.jserrors).toEqual({
    autoStart: true,
    enabled: true
  })
  expect(config.logging).toEqual({
    autoStart: true,
    enabled: true
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
    enabled: true,
    elementAttributes: ['id', 'className', 'tagName', 'type']
  })
  expect(config.page_view_event).toEqual({
    autoStart: true,
    enabled: true
  })
  expect(config.page_view_timing).toEqual({
    autoStart: true,
    enabled: true
  })
  expect(config.performance).toEqual({
    capture_marks: false,
    capture_measures: false,
    capture_detail: true,
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
    enabled: true
  })
  expect(config.soft_navigations).toEqual({
    autoStart: true,
    enabled: true
  })
  expect(config.spa).toEqual({
    autoStart: true,
    enabled: true
  })
  expect(config.ssl).toEqual(undefined)
  expect(config.user_actions).toEqual({
    enabled: true,
    elementAttributes: ['id', 'className', 'tagName', 'type']
  })
  expect(config.browser_consent_mode.enabled).toEqual(false)
})

describe('property getters/setters used for validation', () => {
  test('invalid values do not pass through', () => {
    const retInit = mergeInit({
      session_replay: {
        block_selector: '[invalid selector]',
        mask_text_selector: '[invalid selector]',
        mask_input_options: 'select:true'
      }
    })

    expect(retInit.session_replay.block_selector).toEqual('[data-nr-block]')
    expect(retInit.session_replay.mask_text_selector).toEqual('*')
    expect(retInit.session_replay.mask_input_options).toMatchObject({ password: true, select: false })
  })

  test('valid values do pass through', () => {
    const retInit = mergeInit({
      session_replay: {
        block_selector: '[block-text-test]',
        mask_text_selector: '[mask-text-test]',
        mask_input_options: { select: true }
      }
    })

    expect(retInit.session_replay.block_selector).toEqual('[data-nr-block],[block-text-test]')
    expect(retInit.session_replay.mask_text_selector).toEqual('[mask-text-test],[data-nr-mask]')
    expect(retInit.session_replay.mask_input_options).toMatchObject({ password: true, select: true })
  })

  test('null accepted for mask_text', () => {
    const retInit = mergeInit({
      session_replay: {
        mask_text_selector: null
      }
    })

    expect(retInit.session_replay.mask_text_selector).toEqual('[data-nr-mask]')
  })

  test('empty string accepted for mask_text', () => {
    const retInit = mergeInit({
      session_replay: {
        mask_text_selector: ''
      }
    })

    expect(retInit.session_replay.mask_text_selector).toEqual('[data-nr-mask]')
  })

  test('props without a setter does not issue on attempted assignment', () => {
    const retInit = mergeInit({
      session_replay: {
        block_class: undefined,
        ignore_class: null,
        mask_text_class: '',
        mask_input_options: { select: true }
      }
    })

    expect(retInit.session_replay.block_class).toEqual('nr-block')
    expect(retInit.session_replay.ignore_class).toEqual('nr-ignore')
    expect(retInit.session_replay.mask_text_class).toEqual('nr-mask')
    expect(retInit.session_replay.mask_input_options).toMatchObject({ password: true, select: true })
  })
})
