#!/usr/bin/env node

module.require('babel/polyfill')

var path = module.require('path')
var require = module.require('es6-require')(module, null, path.resolve(__dirname, '../../..'))
var config = require('../runner/args.es6')

if (!config.timeout) config.timeout = 32000
if (!config.port) config.port = 3333

config.cache = false

var driver = require('../index.es6')

var hostname = config.host
driver.router.handle(driver.assetServer.defaultAgentConfig.licenseKey, true)

driver.assetServer.renderIndex = true
console.log('asset server: http://' + hostname + ':' + driver.assetServer.port)
if (driver.assetServer.sslPort) {
  console.log('asset server (SSL): https://' + hostname + ':' + driver.assetServer.sslPort)
}
console.log('fake router: http://' + hostname + ':' + driver.router.port)
if (driver.router.sslPort) {
  console.log('fake router (SSL): https://' + hostname + ':' + driver.router.sslPort)
}
console.log('secondary (cors) server: http://' + hostname + ':' + driver.assetServer.corsServer.port)
