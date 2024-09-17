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

module.exports.rumFlags = {
  loaded: 1, // Used internally to signal the tests that the agent has loaded

  st: 1, // session trace entitlements 0|1
  err: 1, // err entitlements 0|1
  ins: 1, // ins entitlements 0|1
  spa: 1, // spa entitlements 0|1
  sr: 1, // session replay entitlements 0|1
  sts: 1, // session trace sampling 0|1|2 - off full error
  srs: 1, // session replay sampling 0|1|2 - off full error
  app: {
    agents: [
      { entityGuid: defaultEntityGuid }
    ]
  }
}

const enabled = true; const autoStart = true; const harvestTimeSeconds = 5
const enabledFeature = { enabled, autoStart, harvestTimeSeconds }
module.exports.defaultInitBlock = {
  ajax: { deny_list: [], block_internal: false, ...enabledFeature },
  distributed_tracing: {},
  feature_flags: [],
  generic_events: enabledFeature,
  harvest: { tooManyRequestsDelay: 5 },
  jserrors: enabledFeature,
  logging: enabledFeature,
  metrics: { enabled, autoStart },
  obfuscate: undefined,
  page_action: { enabled },
  user_actions: { enabled },
  page_view_event: { enabled, autoStart },
  page_view_timing: enabledFeature,
  privacy: { cookies_enabled: true },
  session: { expiresMs: 14400000, inactiveMs: 1800000 },
  session_replay: { enabled: false, harvestTimeSeconds, sampling_rate: 0, error_sampling_rate: 0, autoStart },
  session_trace: enabledFeature,
  ssl: false,
  soft_navigations: enabledFeature,
  spa: enabledFeature
}
