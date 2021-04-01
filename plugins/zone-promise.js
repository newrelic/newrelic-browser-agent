var handle = require('handle')
var frameworksEE = require('ee').get('frameworks')
var promiseWrapper = require('wrap-function')(frameworksEE)

var api = null
var instrumented = false

// register itself with the SPA feature
handle('spa-register', [init])

function init(pluginApi) {
  if (!pluginApi) return
  api = pluginApi
  instrument()
}

window.addEventListener('DOMContentLoaded', function () {
  instrument()
})

function instrument() {
  if (instrumented) return
  wrapZonePromise()
}

function wrapZonePromise() {
  // instrument Zone.js promise
  if (window.Promise.toString().indexOf('ZoneAwarePromise') > -1) {
    promiseWrapper.inPlace(window.Promise.prototype, ['then'], 'zonepromise-then-', getPromise)
    instrumented = true
  }
}

function getPromise (args, originalThis) {
  return originalThis
}

// handle wrapped function events
frameworksEE.on('zonepromise-then-start', function (args, originalThis) {
  if (!api) return
  var currentNode = api.getCurrentNode()
  if (currentNode) {
    this.promise = originalThis
    this.spaNode = currentNode

    if (typeof args[0] === 'function') {
      args[0] = promiseWrapper(args[0], 'zonepromise-cb-', this)
    }
    if (typeof args[1] === 'function') {
      args[1] = promiseWrapper(args[1], 'zonepromise-cb-', this)
    }
  }
})

frameworksEE.on('zonepromise-cb-start', function(args) {
  if (!api) return
  if (this.spaNode) {
    this.prevNode = api.getCurrentNode()
    api.setCurrentNode(this.spaNode)
  }
})

frameworksEE.on('zonepromise-cb-end', function(args) {
  if (!api) return
  if (this.spaNode) {
    api.setCurrentNode(this.prevNode)
  }
})
