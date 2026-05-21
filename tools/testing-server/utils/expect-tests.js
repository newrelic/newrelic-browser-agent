/**
 * This file contains a set of common test cases that can be applied to test server
 * expects within integration tests. These functions are meant to be self-contained
 * and serialized via stringify-ing to support cross-process communication withing WDIO.
 *
 * **DO NOT**
 * - Add require statements outside the function
 * - Try to call other functions outside the function
 *
 * **USAGE**
 * Each function is called using `fn.call(this, request)` from the TestHandle instance.
 *
 */

module.exports.testAssetRequest = function testAssetRequest (request) {
  const url = new URL(request.url, 'resolve://')
  return url.pathname.indexOf('.html') > -1
}

module.exports.testRumRequest = function testRumRequest (request) {
  const url = new URL(request.url, 'resolve://')
  return url.pathname === `/1/${this.testId}`
}

module.exports.testEventsRequest = function testEventsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/events/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request.body) && request.body.length > 0) {
    return true
  }

  if (request?.query?.e) {
    try {
      const events = require('@newrelic/nr-querypack').decode(request.query.e)
      return Array.isArray(events) && events.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testMFEEventsRequest = function testEventsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/events/2/${this.testId}`) {
    return false
  }

  if (Array.isArray(request.body) && request.body.length > 0) {
    return true
  }

  if (request?.query?.e) {
    try {
      const events = require('@newrelic/nr-querypack').decode(request.query.e)
      return Array.isArray(events) && events.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testTimingEventsRequest = function testTimingEventsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/events/1/${this.testId}`) {
    return false
  }

  if (
    Array.isArray(request.body) &&
    request.body.findIndex((qpData) => qpData.type === 'timing') > -1
  ) {
    return true
  }

  if (request?.query?.e) {
    try {
      const events = require('@newrelic/nr-querypack').decode(request.query.e)
      return (
        Array.isArray(events) &&
        events.findIndex((qpData) => qpData.type === 'timing') > -1
      )
    } catch (error) {
      return false
    }
  }
}

module.exports.testAjaxEventsRequest = function testAjaxEventsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/events/1/${this.testId}`) {
    return false
  }

  if (
    Array.isArray(request.body) &&
    request.body.findIndex((qpData) => qpData.type === 'ajax') > -1
  ) {
    return true
  }

  if (request?.query?.e) {
    try {
      const events = require('@newrelic/nr-querypack').decode(request.query.e)
      return (
        Array.isArray(events) &&
        events.findIndex((qpData) => qpData.type === 'ajax') > -1
      )
    } catch (error) {
      return false
    }
  }
}

module.exports.testMFEAjaxEventsRequest = function testAjaxEventsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/events/2/${this.testId}`) {
    return false
  }

  if (
    Array.isArray(request.body) &&
    request.body.findIndex((qpData) => qpData.type === 'ajax') > -1
  ) {
    return true
  }

  if (request?.query?.e) {
    try {
      const events = require('@newrelic/nr-querypack').decode(request.query.e)
      return (
        Array.isArray(events) &&
        events.findIndex((qpData) => qpData.type === 'ajax') > -1
      )
    } catch (error) {
      return false
    }
  }
}

module.exports.testInteractionEventsRequest = function testInteractionEventsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/events/1/${this.testId}`) {
    return false
  }

  if (
    Array.isArray(request.body) &&
    request.body.findIndex((qpData) => qpData.type === 'interaction') > -1
  ) {
    return true
  }

  if (request?.query?.e) {
    try {
      const events = require('@newrelic/nr-querypack').decode(request.query.e)
      return (
        Array.isArray(events) &&
        events.findIndex((qpData) => qpData.type === 'interaction') > -1
      )
    } catch (error) {
      return false
    }
  }
}

module.exports.testMetricsRequest = function testMetricsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.cm) && request.body.cm.length > 0) {
    return true
  }

  if (Array.isArray(request?.body?.sm) && request.body.sm.length > 0) {
    return true
  }

  if (request?.query?.cm) {
    try {
      const customMetrics = JSON.parse(request.query.cm)
      return Array.isArray(customMetrics) && customMetrics.length > 0
    } catch (error) {
      return false
    }
  }

  if (request?.query?.sm) {
    try {
      const supportMetrics = JSON.parse(request.query.sm)
      return Array.isArray(supportMetrics) && supportMetrics.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testCustomMetricsRequest = function testCustomMetricsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.cm) && request.body.cm.length > 0) {
    return true
  }

  if (request?.query?.cm) {
    try {
      const customMetrics = JSON.parse(request.query.cm)
      return Array.isArray(customMetrics) && customMetrics.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testSupportMetricsRequest = function testSupportMetricsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.sm) && request.body.sm.length > 0) {
    return true
  }

  if (request?.query?.sm) {
    try {
      const supportMetrics = JSON.parse(request.query.sm)
      return Array.isArray(supportMetrics) && supportMetrics.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testErrorsRequest = function testErrorsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.err) && request.body.err.length > 0) {
    return true
  }

  if (request?.query?.err) {
    try {
      const jserrors = JSON.parse(request.query.err)
      return Array.isArray(jserrors) && jserrors.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testMFEErrorsRequest = function testErrorsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/2/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.err) && request.body.err.length > 0) {
    return true
  }

  if (request?.query?.err) {
    try {
      const jserrors = JSON.parse(request.query.err)
      return Array.isArray(jserrors) && jserrors.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testInternalErrorsRequest = function testInternalErrorsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.ierr) && request.body.ierr.length > 0) {
    return true
  }

  if (request?.query?.ierr) {
    try {
      const internalErrors = JSON.parse(request.query.ierr)
      return Array.isArray(internalErrors) && internalErrors.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testMFEInternalErrorsRequest = function testInternalErrorsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/2/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.ierr) && request.body.ierr.length > 0) {
    return true
  }

  if (request?.query?.ierr) {
    try {
      const internalErrors = JSON.parse(request.query.ierr)
      return Array.isArray(internalErrors) && internalErrors.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testAnyJseXhrRequest = function testErrorsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/1/${this.testId}`) {
    return false
  }

  const bodyKeys = Object.keys(request?.body || {})
  if (bodyKeys.some(k => request.body[k]?.length > 0)) return true
}

module.exports.testAnyMFEJseXhrRequest = function testErrorsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/2/${this.testId}`) {
    return false
  }

  const bodyKeys = Object.keys(request?.body || {})
  if (bodyKeys.some(k => request.body[k]?.length > 0)) return true
}

module.exports.testAjaxTimeSlicesRequest = function testAjaxTimeSlicesRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/jserrors/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.xhr) && request.body.xhr.length > 0) {
    return true
  }

  if (request?.query?.xhr) {
    try {
      const ajaxCalls = JSON.parse(request.query.xhr)
      return Array.isArray(ajaxCalls) && ajaxCalls.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testInsRequest = function testInsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/ins/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.ins) && request.body.ins.length > 0) {
    return true
  }

  if (request?.query?.ins) {
    try {
      const ins = JSON.parse(request.query.ins)
      return Array.isArray(ins) && ins.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testMFEInsRequest = function testInsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/ins/2/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.ins) && request.body.ins.length > 0) {
    return true
  }

  if (request?.query?.ins) {
    try {
      const ins = JSON.parse(request.query.ins)
      return Array.isArray(ins) && ins.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testResourcesRequest = function testResourcesRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== `/resources/1/${this.testId}`) {
    return false
  }

  if (Array.isArray(request?.body?.res) && request.body.res.length > 0) {
    return true
  }

  if (request?.query?.res) {
    try {
      const res = JSON.parse(request.query.res)
      return Array.isArray(res) && res.length > 0
    } catch (error) {
      return false
    }
  }
}

module.exports.testBlobRequest = function testBlobRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== '/browser/blobs') return false
  if (request?.query?.browser_monitoring_key !== this.testId) return false

  try {
    const body = request?.body
    const blobContents = body // JSON array
    return !!(blobContents && Array.isArray(blobContents) && blobContents.length)
  } catch (err) {
    return false
  }
}

module.exports.testBlobReplayRequest = function testBlobReplayRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== '/browser/blobs') return false
  if (request?.query?.browser_monitoring_key !== this.testId) return false
  if (request?.query?.type !== 'SessionReplay') return false
  try {
    const body = request?.body
    const blobContents = body // JSON array
    return !!(blobContents && Array.isArray(blobContents) && blobContents.length)
  } catch (err) {
    return false
  }
}

module.exports.testBlobTraceRequest = function testBlobTraceRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== '/browser/blobs') return false
  if (request?.query?.browser_monitoring_key !== this.testId) return false
  if (request?.query?.type !== 'BrowserSessionChunk') return false
  try {
    const body = request?.body
    const blobContents = body // JSON array
    return !!(blobContents && Array.isArray(blobContents) && blobContents.length)
  } catch (err) {
    return false
  }
}

module.exports.testSessionReplaySnapshotRequest = function testSessionReplaySnapshotRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== '/browser/blobs') return false
  if (request?.query?.browser_monitoring_key !== this.testId) return false
  if (!(request?.body && Array.isArray(request.body) && request.body.length)) return false
  return !!(request.body.filter(x => x.type === 2).length)
}

module.exports.testLogsRequest = function testLogsRequest (request) {
  const url = new URL(request.url, 'resolve://')
  if (url.pathname !== '/browser/logs') return false
  if (request?.query?.browser_monitoring_key !== this.testId) return false

  try {
    return !!request?.body
  } catch (err) {
    return false
  }
}
