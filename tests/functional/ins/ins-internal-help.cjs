const now = require('../../lib/now.js')

module.exports = { fail, validatePageActionData }

function fail (t) {
  return (err) => {
    t.error(err)
    t.end()
  }
}

function validatePageActionData (t, pageActionData, query) {
  let receiptTime = now()

  t.equal(pageActionData.length, 1, 'should have 1 event')

  let event = pageActionData[0]
  t.equal(event.actionName, 'DummyEvent', 'event has correct action name')
  t.equal(event.free, 'tacos', 'event has free tacos')

  let relativeHarvestTime = query.rst
  let estimatedPageLoad = receiptTime - relativeHarvestTime
  let eventTimeSinceLoad = event.timeSinceLoad * 1000
  let estimatedEventTime = eventTimeSinceLoad + estimatedPageLoad

  t.ok(relativeHarvestTime > eventTimeSinceLoad, 'harvest time (' + relativeHarvestTime + ') should always be bigger than event time (' + eventTimeSinceLoad + ')')
  t.ok(estimatedEventTime < receiptTime, 'estimated event time (' + estimatedEventTime + ') < receipt time (' + receiptTime + ')')
}
