/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const http = require('http')
const https = require('https')
const cors = require('cors')
const url = require('url')
const enableDestroy = require('server-destroy')

// SSL is currently not setup, tests will always run over HTTP
// if we re-enable SSL, we would need to provide cert and key in sslConfiguration
let sslOptions = {}

class BaseServer {
  constructor () {
    this.server = http.createServer((req, res) => this.handleReq(req, res, false))
    this.sslServer = https.createServer(sslOptions, (req, res) => this.handleReq(req, res, true))

    enableDestroy(this.server)
    enableDestroy(this.sslServer)
    this.handlers = []
    this.cors = cors({origin: true, credentials: true, exposedHeaders: 'X-NewRelic-App-Data'})
    this.tag = ''
    this.logRequests = false
    this.sslPort = null
  }

  addHandler (fn) {
    this.handlers.push(fn)
  }

  handleReq (req, res, ssl) {
    let server = this

    if (this.logRequests) {
      console.log(this.tag + ' -> ' + req.method + ' ' + req.url)
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-origin', '*')
      res.setHeader('access-control-allow-headers', 'newrelic, traceparent, tracestate')
      res.end()
      return
    }

    if (url.parse(req.url, true).query.cors === 'false') {
      dispatch()
    } else {
      this.cors(req, res, dispatch)
    }

    function dispatch (err) {
      if (err) throw err
      for (let handler of server.handlers) {
        handler(req, res, ssl)
      }
    }
  }

  start (port = null, sslPort = null, done) {
    if (port >= 0) {
      this.server.listen(port)
    }
    if (sslPort >= 0) {
      this.sslPort = sslPort
      this.sslServer.listen(sslPort, done)
    }
  }

  stop () {
    this.server.destroy()
    this.sslServer.destroy()
  }

  get port () {
    return this.server.address() ? this.server.address().port : undefined
  }
}

module.exports = BaseServer
