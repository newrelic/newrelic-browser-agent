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

module.exports.testRumRequest = function (request) {
  const url = new URL(request.url, 'resolve://')
  return url.pathname === `/1/${this.testId}`
}

module.exports.testEventsRequest = function (request) {
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

module.exports.testTimingEventsRequest = function (request) {
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

module.exports.testAjaxEventsRequest = function (request) {
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

module.exports.testInteractionEventsRequest = function (request) {
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

module.exports.testMetricsRequest = function (request) {
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

module.exports.testCustomMetricsRequest = function (request) {
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

module.exports.testSupportMetricsRequest = function (request) {
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

module.exports.testErrorsRequest = function (request) {
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

module.exports.testAjaxTimeSlicesRequest = function (request) {
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

module.exports.testInsRequest = function (request) {
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

module.exports.testResourcesRequest = function (request) {
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
