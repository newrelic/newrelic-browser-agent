import http from 'http'
import https from 'https'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import url from 'url'
import enableDestroy from 'server-destroy'

let sslCertDir = path.resolve(__dirname, '../../../lib/ssl_proxy/config/')

let sslOptions = {
  key: fs.readFileSync(path.resolve(sslCertDir, 'nr-local.net.key')),
  cert: fs.readFileSync(path.resolve(sslCertDir, 'nr-local.net.crt'))
}

export default class BaseServer {
  constructor () {
    this.server = http.createServer((req, res) => this.handleReq(req, res, false))
    this.sslServer = https.createServer(sslOptions, (req, res) => this.handleReq(req, res, true))

    enableDestroy(this.server)
    enableDestroy(this.sslServer)
    this.handlers = []
    this.cors = cors({origin: true, credentials: true, exposedHeaders: 'X-NewRelic-App-Data'})
    this.tag = ''
    this.logRequests = false
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

  start (port = 0, sslPort = 0, done) {
    if (port >= 0) {
      this.server.listen(port)
    }
    if (sslPort >= 0) {
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

  get sslPort () {
    return this.sslServer.address().port
  }
}
