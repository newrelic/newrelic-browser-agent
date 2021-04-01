var test = require('../../tools/jil/browser-test.js')
var sinon = require('sinon')
var now = require('now')
var harvest = require('../../agent/harvest')
var submitData = require('../../agent/submit-data')
var HarvestScheduler = require('../../agent/harvest-scheduler')

var nrInfo = { errorBeacon: 'foo', licenseKey: 'bar' }
var nrOrigin = 'http://foo.com?bar=crunchy#bacon'
var mockLoader = { features: {}, info: nrInfo, origin: nrOrigin, offset: now.getLastTimestamp(), now: now }

function resetSpies(options) {
  options = options || {}

  if (harvest.send.isSinonProxy) {
    harvest.send.restore()
  }
  if (harvest.sendX.isSinonProxy) {
    harvest.sendX.restore()
  }
  if (harvest.getSubmitMethod.isSinonProxy) {
    harvest.getSubmitMethod.restore()
  }
  if (HarvestScheduler.prototype.scheduleHarvest.isSinonProxy) {
    HarvestScheduler.prototype.scheduleHarvest.restore()
  }

  sinon.stub(harvest, 'send', fakeSend)
  sinon.stub(harvest, 'sendX', fakeSendX)
  sinon.stub(harvest, 'getSubmitMethod', fakeGetSubmitMethod)

  function fakeSend(endpoint, nr, payload, opts, submitMethod, cbFinished) {
    setTimeout(function() {
      var response = options.response || { sent: true }
      cbFinished(response)
    }, 0)
  }

  function fakeSendX(endpoint, nr, opts, cbFinished) {
    setTimeout(function() {
      var response = options.response || { sent: true }
      cbFinished(response)
    }, 0)
  }

  function fakeGetSubmitMethod() {
    return {
      method: options.submitMethod || submitData.beacon
    }
  }
}

test('after calling startTimer, periodically invokes harvest', function (t) {
  resetSpies()
  var calls = 0

  var scheduler = new HarvestScheduler(mockLoader, 'endpoint', { onFinished: onFinished, getPayload: getPayload })
  scheduler.startTimer(0.1)

  function getPayload() {
    return { body: {} }
  }

  function onFinished() {
    calls++
    if (calls > 1) {
      scheduler.stopTimer()
      validate()
    }
  }

  function validate() {
    t.equal(harvest.send.callCount, 2, 'harvest was initiated more than once')
    t.end()
  }
})

test('scheduleHarvest invokes harvest once', function (t) {
  resetSpies()

  var scheduler = new HarvestScheduler(mockLoader, 'endpoint', { getPayload: getPayload })
  scheduler.scheduleHarvest(0.1)

  function getPayload() {
    return { body: {} }
  }

  setTimeout(validate, 1000)

  function validate() {
    t.equal(harvest.send.callCount, 1, 'harvest was initiated once')
    t.end()
  }
})

test('when getPayload is provided, calls harvest.send', function(t) {
  resetSpies()
  var scheduler = new HarvestScheduler(mockLoader, 'endpoint', { onFinished: onFinished, getPayload: getPayload })
  scheduler.startTimer(0.1)

  function getPayload() {
    return { body: {} }
  }

  function onFinished() {
    scheduler.stopTimer()
    t.ok(harvest.send.called, 'harvest.send was called')
    t.notOk(harvest.sendX.called, 'harvest.sendX was not called')
    t.end()
  }
})

test('when getPayload is not provided, calls harvest.sendX', function(t) {
  resetSpies()
  var scheduler = new HarvestScheduler(mockLoader, 'endpoint', { onFinished: onFinished })
  scheduler.startTimer(0.1)

  function onFinished() {
    scheduler.stopTimer()
    t.notOk(harvest.send.called, 'harvest.send was not called')
    t.ok(harvest.sendX.called, 'harvest.sendX was called')
    t.end()
  }
})

test('does not call harvest.send when payload is null', function(t) {
  resetSpies()
  var scheduler = new HarvestScheduler(mockLoader, 'endpoint', { getPayload: getPayload })
  scheduler.startTimer(0.1)

  function getPayload() {
    setTimeout(validate, 0)
    return null
  }

  function validate() {
    scheduler.stopTimer()
    t.notOk(harvest.send.called, 'harvest.send was not called')
    t.notOk(harvest.sendX.called, 'harvest.sendX was not called')
    t.end()
  }
})

test('provides retry to getPayload when submit method is xhr', function(t) {
  resetSpies({ submitMethod: submitData.xhr })

  var scheduler = new HarvestScheduler(mockLoader, 'endpoint', { getPayload: getPayload })
  scheduler.startTimer(0.1)

  function getPayload(opts) {
    scheduler.stopTimer()
    setTimeout(function() {
      var call = harvest.send.getCall(0)
      t.equal(call.args[4].method, submitData.xhr, 'method was xhr')
      t.ok(opts.retry, 'retry was set to true')
      t.end()
    }, 0)
    return { body: {} }
  }
})

test('when retrying, uses delay provided by harvest response', function(t) {
  resetSpies({
    response: { sent: true, retry: true, delay: 0.2 }
  })
  sinon.spy(HarvestScheduler.prototype, 'scheduleHarvest')

  var scheduler = new HarvestScheduler(mockLoader, 'endpoint', { onFinished: onFinished, getPayload: getPayload })
  scheduler.scheduleHarvest(0.1)

  var count = 0
  function getPayload() {
    return { body: {} }
  }

  function onFinished(result) {
    count++
    if (count > 1) {
      scheduler.stopTimer()
      validate()
    }
  }

  function validate() {
    t.equal(HarvestScheduler.prototype.scheduleHarvest.callCount, 2)
    var call = HarvestScheduler.prototype.scheduleHarvest.getCall(0)
    t.equal(call.args[0], 0.1)
    call = HarvestScheduler.prototype.scheduleHarvest.getCall(1)
    t.equal(call.args[0], 0.2)
    t.end()
  }
})
