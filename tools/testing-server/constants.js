const path = require('path')

const defaultAgentConfig = {
  licenseKey: 'asdf',
  applicationID: 42,
  accountID: 123,
  agentID: 456,
  trustKey: 789
}
module.exports.defaultAgentConfig = defaultAgentConfig

const mockEntityGuid = () => {
  return btoa(`${defaultAgentConfig.accountID}|BROWSER|APPLICATION|${Math.floor(Math.random() * 1000000)}`).replace(/=/g, '')
}

module.exports.paths = {
  rootDir: path.resolve(__dirname, '../../'),
  builtAssetsDir: path.resolve(__dirname, '../../build/'),
  testsRootDir: path.resolve(__dirname, '../../tests/'),
  testsAssetsDir: path.resolve(__dirname, '../../tests/assets/')
}

module.exports.loaderConfigKeys = [
  'accountID',
  'agentID',
  'applicationID',
  'licenseKey',
  'trustKey'
]

module.exports.loaderOnlyConfigKeys = ['accountID', 'agentID', 'trustKey']

const defaultFlagValue = (flag) => {
  if (flag !== undefined) return flag
  return 1
}
module.exports.rumFlags = (flags = {}, app = {}) => ({
  loaded: defaultFlagValue(flags.loaded), // Used internally to signal the tests that the agent has loaded
  st: defaultFlagValue(flags.st), // session trace entitlements 0|1
  err: defaultFlagValue(flags.err), // err entitlements 0|1
  ins: defaultFlagValue(flags.ins), // ins entitlements 0|1
  spa: defaultFlagValue(flags.spa), // spa entitlements 0|1
  sr: defaultFlagValue(flags.sr), // session replay entitlements 0|1
  sts: defaultFlagValue(flags.sts), // session trace sampling 0|1|2 - off full error
  srs: defaultFlagValue(flags.srs), // session replay sampling 0|1|2 - off full error
  log: flags.log ?? 3, // logging sampling 0|1|2|3|4|5 - off error warn info debug trace
  app: {
    agents: app.agents || [
      { entityGuid: mockEntityGuid() }
    ],
    nrServerTime: app.nrServerTime || Date.now()
  }
})

const enabled = true; const autoStart = true
const enabledFeature = { enabled, autoStart }
module.exports.defaultInitBlock = {
  ajax: { deny_list: [], block_internal: false, ...enabledFeature },
  api: {
    allow_registered_children: true,
    duplicate_registered_data: false // if an array of entity guids are supplied, can be more granular - true|false will be all or nothing
  },
  distributed_tracing: {},
  feature_flags: [],
  generic_events: enabledFeature,
  harvest: { interval: 5 },
  jserrors: enabledFeature,
  logging: enabledFeature,
  metrics: { enabled, autoStart },
  obfuscate: undefined,
  performance: {
    capture_marks: true,
    capture_measures: true,
    resources: { enabled, asset_types: [], first_party_domains: [], ignore_newrelic: true }
  },
  page_action: { enabled },
  page_view_event: { enabled, autoStart },
  page_view_timing: enabledFeature,
  privacy: { cookies_enabled: true },
  session: { expiresMs: 14400000, inactiveMs: 1800000 },
  session_replay: { enabled: false, sampling_rate: 0, error_sampling_rate: 0, autoStart },
  session_trace: enabledFeature,
  ssl: false,
  soft_navigations: enabledFeature,
  spa: enabledFeature,
  user_actions: { enabled: true, elementAttributes: ['id', 'className', 'tagName', 'type'] }
}
