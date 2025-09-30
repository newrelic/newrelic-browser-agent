import { AgentOptions } from '../../dist/types/loaders/agent'
import { expectType, expectError } from 'tsd'

// Valid AgentOptions
const validOptions: AgentOptions = {
  info: {
    beacon: 'https://beacon.example.com',
    errorBeacon: 'https://errorbeacon.example.com',
    licenseKey: 'abc123XYZ',
    applicationID: 'appID456DEF',
    sa: 1,
    queueTime: 100,
    applicationTime: 200,
    ttGuid: 'guid789GHI',
    user: 'userAlpha',
    account: 'accountBeta',
    product: 'productGamma',
    extra: 'extraDelta',
    jsAttributes: { key: 'valueOmega' },
    userAttributes: 'userAttributesTheta',
    atts: 'attsSigma',
    transactionName: 'transactionNameLambda',
    tNamePlain: 'tNamePlainKappa'
  },
  init: {
    ajax: {
      deny_list: ['https://denylist.example.com'],
      block_internal: true,
      enabled: true,
      autoStart: false
    },
    distributed_tracing: {
      enabled: true,
      exclude_newrelic_header: false,
      cors_use_newrelic_header: true,
      cors_use_tracecontext_headers: true,
      allowed_origins: ['https://allowedorigin.example.com']
    },
    feature_flags: ['flagOne', 'flagTwo'],
    generic_events: {
      enabled: true,
      autoStart: false
    },
    harvest: {
      interval: 60
    },
    jserrors: {
      enabled: true,
      autoStart: false
    },
    logging: {
      enabled: true,
      autoStart: false
    },
    metrics: {
      enabled: true,
      autoStart: false
    },
    obfuscate: [{ regex: /sensitive/, replacement: '****' }],
    page_action: {
      enabled: true
    },
    page_view_event: {
      enabled: true,
      autoStart: false
    },
    page_view_timing: {
      enabled: true,
      autoStart: false
    },
    performance: {
      capture_marks: true,
      capture_measures: true,
      capture_detail: true,
      resources: {
        enabled: true,
        asset_types: ['script', 'img'],
        first_party_domains: ['example.com'],
        ignore_newrelic: true
      }
    },
    privacy: {
      cookies_enabled: true
    },
    proxy: {
      assets: 'https://assetsproxy.example.com',
      beacon: 'https://beaconproxy.example.com'
    },
    session: {
      expiresMs: 3600000,
      inactiveMs: 1800000
    },
    session_replay: {
      autoStart: true,
      enabled: false,
      preload: false,
      // sampling_rate: 10,
      // error_sampling_rate: 100,
      collect_fonts: false,
      inline_images: false,
      fix_stylesheets: true,
      mask_all_inputs: true,
      mask_text_selector: '.mask-text',
      block_selector: '.block-element',
      mask_input_options: { password: true }
    },
    session_trace: {
      enabled: true,
      autoStart: false
    },
    soft_navigations: {
      enabled: true,
      autoStart: false
    },
    spa: {
      enabled: true,
      autoStart: false
    },
    ssl: true,
    user_actions: {
      enabled: true,
      elementAttributes: ['id', 'className', 'tagName', 'type']
    }
  },
  runtime: {
    customTransaction: 'transOmega',
    disabled: false,
    isolatedBacklog: false,
    loaderType: 'agent',
    maxBytes: 30000,
    onerror: () => {},
    ptid: 'ptid123',
    releaseIds: { id: 'releaseId456' },
    appMetadata: { key: 'metaValue' },
    session: { key: 'sessionValue' },
    denyList: { key: 'denyValue' },
    timeKeeper: { key: 'timeValue' },
    obfuscator: { key: 'obfuscateValue' },
    harvester: { key: 'harvestValue' }
  },
  loader_config: {
    accountID: 'accID789',
    trustKey: 'trustKey012',
    agentID: 'agentID345',
    licenseKey: 'licenseKey678',
    applicationID: 'appID901',
    xpid: 'xpid234'
  },
  features: [],
  exposed: true,
  loaderType: 'agent'
}
expectType<AgentOptions>(validOptions)

// Just the strictly required fields for AgentOptions
const minimalValidOptions: AgentOptions = {
  info: {
    licenseKey: 'abcde',
    applicationID: '12345'
  }
}
expectType<AgentOptions>(minimalValidOptions)

// Invalid AgentOptions
expectError<AgentOptions>({ info: undefined }) // missing required info at minimum

expectError<AgentOptions>({
  info: {
    applicationID: 12345, // should be a string
		licenseKey: { key: 'abc' } // should be a string
  }
})

expectError<AgentOptions>({
  init: {
    ajax: {
      deny_list: 'https://deny.example.com' // should be an array of strings
    }
  }
})

expectError<AgentOptions>({
  loader_config: 'invalid' // should be an object
})

expectError<AgentOptions>({
  runtime: true // should be an object
})

expectError<AgentOptions>({
  features: 'invalid' // should be an array
})

expectError<AgentOptions>({
  exposed: 'true' // should be a boolean
})

expectError<AgentOptions>({
  loaderType: 123 // should be a string
})