const path = require('path')

const defaultAgentConfig = {
  licenseKey: 'asdf',
  applicationID: 42,
  accountID: 123,
  agentID: 456,
  trustKey: 789
}
module.exports.defaultAgentConfig = defaultAgentConfig

const defaultEntityGuid = btoa(`${defaultAgentConfig.accountID}|BROWSER|APPLICATION|${defaultAgentConfig.applicationID}`).replace(/=/g, '')
module.exports.defaultEntityGuid = defaultEntityGuid

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
  app: {
    agents: app.agents || [
      { entityGuid: defaultEntityGuid }
    ],
    nrServerTime: app.nrServerTime || Date.now()
  }
})

const enabled = true; const autoStart = true; const harvestTimeSeconds = 5
const enabledFeature = { enabled, autoStart, harvestTimeSeconds }
module.exports.defaultInitBlock = {
  ajax: { deny_list: [], block_internal: false, ...enabledFeature },
  distributed_tracing: {},
  feature_flags: [],
  generic_events: enabledFeature,
  harvest: { tooManyRequestsDelay: 5, interval: 5 },
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
  session_replay: { enabled: false, harvestTimeSeconds, sampling_rate: 0, error_sampling_rate: 0, autoStart },
  session_trace: enabledFeature,
  ssl: false,
  soft_navigations: enabledFeature,
  spa: enabledFeature,
  user_actions: { enabled: true }
}
