/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const BaseServer = require('./base-server')
const defaultResponders = require('./responders')
const concat = require('concat-stream')
const url = require('url')
const querystring = require('querystring')
const path = require('path')
const { _extend } = require('util')
const { asserters } = require('wd')
const querypack = require('@newrelic/nr-querypack')

let rootDir = path.resolve(__dirname, '../../../')

class Router extends BaseServer {
  constructor(assetServer, config, output) {
    super()
    this.addHandler((req, res, ssl) => this.serviceRequest(req, res, ssl))
    this.assetServer = assetServer
    this.handles = {}
    this.tag = 'router'
    this.timeout = config.timeout
    this.logRequests = !!config.logRequests
    this.output = output
  }

  handle(testID, ...args) {
    this.handles[testID] = new RouterHandle(this, testID, ...args)
    return this.handles[testID]
  }

  serviceRequest(req, res, ssl) {
    let parsed = url.parse(req.url, true)
    if (parsed.pathname.match(/^\/debug/)) {
      let ix = parseInt(parsed.query.ix)
      this.log(parsed.query.testId, `DEBUG [${ix}]: ${parsed.query.m}`)
      res.end()
      return
    }

    for (let id in this.handles) {
      if (req.url.indexOf(id) === -1) continue
      return this.handles[id].serviceRequest(req, res, ssl)
    }

    res.writeHead(404)
    res.end('not found')
  }

  log(testId, message) {
    if (this.handles[testId] && this.handles[testId].browser) {
      this.handles[testId].browser.stream.queue(message + '\n')
    } else {
      this.output.log(message)
    }
  }

  urlFor(relativePath, options) {
    let query = querystring.encode(options)
    return url.resolve(
      `${'http'}://${this.assetServer.host}:${this.port}`,
      `${relativePath}?${query}`
    )
  }
}

class RouterHandle {
  constructor(router, testID, useDefaults, browser) {
    this.router = router
    this.testID = testID
    this.useDefaults = useDefaults
    this.flags = {
      stn: 1,
      err: 1,
      ins: 1,
      cap: 1,
      spa: 1,
      loaded: 1
    }
    this.responders = Object.create(defaultResponders)
    this.bufferedRequests = new Set()
    this.pendingExpects = new Set()
    this.browser = browser
    this.timeout = router.timeout

    this.seenRequests = {
      rum: 0,
      events: 0,
      errors: 0,
      errors_get: 0,
      errors_post: 0,
      ins: 0,
      resources: 0
    }

    this.beaconRequests = {
      rum: {
        methods: ['GET', 'POST'],
        path: '/1/{key}'
      },
      events: {
        methods: ['GET', 'POST'],
        path: '/events/1/{key}'
      },
      errors: {
        methods: ['GET', 'POST'],
        path: '/jserrors/1/{key}'
      },
      errors_get: {
        methods: ['GET'],
        path: '/jserrors/1/{key}'
      },
      errors_post: {
        methods: ['POST'],
        path: '/jserrors/1/{key}'
      },
      ins: {
        methods: ['GET', 'POST'],
        path: '/ins/1/{key}'
      },
      resources: {
        methods: ['GET', 'POST'],
        path: '/resources/1/{key}'
      }
    }

    this.scheduledResponses = {}
  }

  expectBeaconRequest(spec, timeout, appID) {
    return this.expect(spec.methods, spec.path, timeout, undefined, appID)
  }

  expectRum(appID) {
    return this.expectBeaconRequest(this.beaconRequests.rum, undefined, appID).then((rumData) => {
      return this.browser.waitForFeature('loaded').then(() => rumData)
    })
  }

  expectEvents(appID) {
    return this.expectBeaconRequest(this.beaconRequests.events, undefined, appID).then(request => {
      let { body, query } = request
      let decoded = querypack.decode(body && body.length ? body : query.e)[0]
      if (decoded.type === 'interaction') {
        return request
      } else {
        return this.expectEvents()
      }
    })
  }

  expectTimings(appID, timeout) {
    return this.expectBeaconRequest(this.beaconRequests.events, timeout, appID).then(request => {
      let { body, query } = request
      let decoded = querypack.decode(body && body.length ? body : query.e)[0]
      if (decoded.type === 'timing') {
        return request
      } else {
        return this.expectTimings()
      }
    })
  }

  expectAjaxEvents(appID) {
    return this.expectBeaconRequest(this.beaconRequests.events, undefined, appID).then(request => {
      let { body, query } = request
      let decoded = querypack.decode(body && body.length ? body : query.e)[0]
      if (decoded.type === 'ajax') {
        return request
      } else {
        return this.expectAjaxEvents()
      }
    })
  }

  async expectSpecificEvents({
    appID, 
    condition=(e) => e.type === 'ajax', 
    expecter='expectAjaxEvents'
  }){
    const {body, query} = await this[expecter](appID)
    const ajaxEvents = querypack.decode(body && body.length ? body : query.e)
    let matches = ajaxEvents.filter(condition)
    if (!matches.length) matches = this.expectSpecificEvents({expecter, condition})
    return matches
  }  

  expectErrors(appID) {
    // errors harvest at 60s
    return this.expectBeaconRequest(this.beaconRequests.errors, 80000, appID)
  }

  expectIns(appID) {
    // insights harvest at 30s
    return this.expectBeaconRequest(this.beaconRequests.ins, 40000, appID)
  }

  expectResources(appID) {
    return this.expectBeaconRequest(this.beaconRequests.resources, undefined, appID)
  }

  expectRumAndErrors(appID) {
    return this.expectRum(appID).then(() => {
      return Promise.all([
        this.browser.safeGet(this.assetURL('/')),
        this.expectErrors(appID)
      ]).then(([feat, err]) => err)
    })
  }

  expectRumAndConditionAndErrors(condition, appID) {
    return this.expectRum(appID).then(() => {
      return Promise.all([
        this.browser
          .waitFor(asserters.jsCondition(condition))
          .safeGet(this.assetURL('/')),
        this.expectErrors(appID)
      ]).then(([feat, err]) => err)
    })
  }

  expectCustomGet(path, handler, appID) {
    return this.expect('GET', path, this.timeout, handler, appID)
  }

  assetURL(asset, query = {}, useRouterUrl = false) {
    let absolute = path.resolve(rootDir, 'tests', 'assets', asset)
    let relative = path.relative(rootDir, absolute)
    let mergedQuery = _extend({}, query)

    if (useRouterUrl) {
      mergedQuery.isAsset = true
    }

    _extend(mergedQuery, {
      loader: query.loader || 'full',
      config: new Buffer(JSON.stringify(_extend({
        licenseKey: this.testID
      }, query.config))).toString('base64')
    })

    if (query.init) {
      _extend(mergedQuery, {
        init: new Buffer(JSON.stringify(query.init)).toString('base64')
      })
    }

    if (useRouterUrl) {
      return this.router.urlFor(relative, mergedQuery)
    }
    return this.router.assetServer.urlFor(relative, mergedQuery)
  }

  beaconURL() {
    return `${'http'}://${this.router.assetServer.host}:${this.router.port}`
  }

  urlForBrowserTest(file) {
    return this.router.assetServer.urlFor('/tests/assets/browser.html', {
      loader: 'full',
      config: new Buffer(JSON.stringify({
        licenseKey: this.testID,
        assetServerPort: this.router.assetServer.port,
        assetServerSSLPort: this.router.assetServer.sslPort,
        corsServerPort: this.router.assetServer.corsServer.port
      })).toString('base64'),
      script: '/' + path.relative(rootDir, file) + '?browserify=true'
    })
  }

  serviceRequest(req, res, ssl) {
    if (req.url.indexOf('isAsset') > -1) {
      let parsedUrl = url.parse(req.url)
      return this.router.assetServer.serveAsset(req, res, parsedUrl, ssl)
    }

    for (let key in this.beaconRequests) {
      if (isMatch(this.testID, this.beaconRequests[key], req)) {
        this.seenRequests[key]++
      }
    }

    for (let expect of this.pendingExpects) {
      if (!expect.test(req)) continue
      clearTimeout(expect.timer)
      this.pendingExpects.delete(expect)
      expect.handle(req, res, ssl)
      return
    }

    // replace with this.bufferedRequests.add(req)
    if (this.useDefaults) {
      let responder = this.findResponder(req)
      if (responder) return responder(req, res, this)
    }

    res.writeHead(404)
    res.end('not found')

    function isMatch(testId, spec, req) {
      let expectedPath = spec.path.replace('{key}', testId)
      var parsed = url.parse(req.url)
      var methodMatch = spec.methods.indexOf(req.method) !== -1
      return methodMatch && parsed.pathname === expectedPath
    }
  }

  waitFor(methods, pathname, timeout, accept, reject, handler, appID) {
    let handle = this
    let expectedPath = pathname.replace('{key}', this.testID)
    let duration = timeout
    let expected = {
      test: test,
      handle: onRequest,
      timer: setTimeout(() => {
        this.pendingExpects.delete(expected)
        reject(new Error(`fake router did not receive ${methods} ${pathname} within ${duration} ms`))
      }, duration)
    }
    // loop over pendind reqs
    this.pendingExpects.add(expected)

    function test(req) {
      var parsed = url.parse(req.url)
      var methodMatch = methods.indexOf(req.method) !== -1

      // if appID is passed into any of the above router.expect() methods,
      // it will find its way here.  This check makes it so that the promise
      // will not resolve unless it matches the ?a=<app_id> provided
      // this is useful when testing more than one agent on one page
      // and allows you to know which promise belongs to which agent
      //
      // ex. router.expectErrors(3) will create a promise that will only resolve
      // once a request is made from the test with '?a=3 as part of its url query params
      if (appID) {
        const appIdInQuery = parsed.search.split('&')[0]
        const id = appIdInQuery ? appIdInQuery.replace('?a=', '') : null
        if (id) return methodMatch && parsed.pathname === expectedPath && Number(id) === appID
      }
      return methodMatch && parsed.pathname === expectedPath
    }

    function onRequest(req, res, ssl) {
      let responder = handler || handle.findResponder(req)
      if (!responder) {
        return reject(new Error(`no responder for ${req.method} ${expectedPath}`))
      }

      req.pipe(concat((data) => {
        let parsed = url.parse(req.url, true)
        parsed.req = req
        parsed.ssl = ssl
        parsed.body = data.toString()
        parsed.headers = req.headers
        parsed.res = res
        responder(req, res, handle, data.toString())
        accept(parsed)
      }))
    }
  }

  findResponder(req) {
    var pathname = url.parse(req.url).pathname.replace(this.testID, '{key}')
    return this.responders[`${req.method} ${pathname}`]
  }

  expect(methodOrMethods, expectedPath, expectedTimeout = this.timeout, handler, appID) {
    let methods = [].concat(methodOrMethods).map((m) => m.toUpperCase())
    return new Promise((resolve, reject) => {
      this.waitFor(methods, expectedPath, expectedTimeout, resolve, reject, handler, appID)
    })
  }

  scheduleResponse(key, statusCode, times) {
    if (!this.scheduledResponses[key]) {
      this.scheduledResponses[key] = []
    }
    if (!times) times = 1
    for (var i = 0; i < times; i++) {
      this.scheduledResponses[key].push({
        statusCode: statusCode
      })
    }
  }

  clearScheduledResponses(key) {
    this.scheduledResponses[key] = []
  }

  getNextScheduledResponse(key) {
    if (this.scheduledResponses[key] && this.scheduledResponses[key].length) {
      return this.scheduledResponses[key].shift()
    }
    return null
  }
}

module.exports = Router
