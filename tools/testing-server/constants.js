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

module.exports.regexReplacementRegex = /"new RegExp\('(.*?)','(.*?)'\)"/g

module.exports.rumFlags = {
  stn: 1,
  err: 1,
  ins: 1,
  cap: 1,
  spa: 1,
  loaded: 1
}
