const path = require('path')

module.exports.defaultAgentConfig = {
  licenseKey: 'asdf',
  applicationID: 42,
  accountID: 123,
  agentID: 456,
  trustKey: 789
}

module.exports.paths = {
  rootDir: path.resolve(__dirname, '../../'),
  builtAssetsDir: path.resolve(__dirname, '../../build/'),
  testsRootDir: path.resolve(__dirname, '../../tests/'),
  testsAssetsDir: path.resolve(__dirname, '../../tests/assets/'),
  testsBrowserDir: path.resolve(__dirname, '../../tests/browser/')
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
  stn: 1,
  err: 1,
  ins: 1,
  cap: 1,
  spa: 1,
  loaded: 1,
  ste: 1,
  sr: 0 // this should be off, for now, if privacy.cookie_enabled is on (default) or Traces tests will fail
}

module.exports.defaultInitBlock = {
  feature_flags: [],
  privacy: { cookies_enabled: true },
  ajax: { deny_list: [], block_internal: false, enabled: true, harvestTimeSeconds: 5, autoStart: true },
  distributed_tracing: {},
  session: { domain: undefined, expiresMs: 14400000, inactiveMs: 1800000 },
  ssl: false,
  obfuscate: undefined,
  jserrors: { enabled: true, harvestTimeSeconds: 5, autoStart: true },
  metrics: { enabled: true, autoStart: true },
  page_action: { enabled: true, harvestTimeSeconds: 5, autoStart: true },
  page_view_event: { enabled: true, autoStart: true },
  page_view_timing: { enabled: true, harvestTimeSeconds: 5, long_task: false, autoStart: true },
  session_trace: { enabled: true, harvestTimeSeconds: 5, autoStart: true },
  spa: { enabled: true, harvestTimeSeconds: 5, autoStart: true },
  harvest: { tooManyRequestsDelay: 5 },
  session_replay: { enabled: false, harvestTimeSeconds: 5, sampling_rate: 0, error_sampling_rate: 0, autoStart: true }
}
