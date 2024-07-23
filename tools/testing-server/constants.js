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
module.exports.defaultInitBlock = {
  feature_flags: [],
  privacy: { cookies_enabled: true },
  ajax: { deny_list: [], block_internal: false, enabled, harvestTimeSeconds, autoStart },
  distributed_tracing: {},
  generic_events: { enabled, harvestTimeSeconds, autoStart },
  session: { expiresMs: 14400000, inactiveMs: 1800000 },
  ssl: false,
  obfuscate: undefined,
  logging: { enabled, harvestTimeSeconds, autoStart },
  jserrors: { enabled, harvestTimeSeconds, autoStart },
  metrics: { enabled, autoStart },
  page_action: { enabled, harvestTimeSeconds, autoStart },
  page_view_event: { enabled, autoStart },
  page_view_timing: { enabled, harvestTimeSeconds, autoStart },
  session_trace: { enabled, harvestTimeSeconds, autoStart },
  spa: { enabled, harvestTimeSeconds, autoStart },
  harvest: { tooManyRequestsDelay: 5 },
  session_replay: { enabled: false, harvestTimeSeconds, sampling_rate: 0, error_sampling_rate: 0, autoStart },
  soft_navigations: { enabled, harvestTimeSeconds, autoStart }
}
