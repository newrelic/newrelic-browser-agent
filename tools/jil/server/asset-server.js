/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const url = require('url')
const path = require('path')
const mime = require('mime-types')
const fs = require('fs')
const zlib = require('zlib')
const querystring = require('querystring')
const browserify = require('browserify')
const babelify = require('babelify')
const BaseServer = require('./base-server')
const ls = require('ls-stream')
const through = require('through')
const Router = require('./router')
const minimatch = require('minimatch')
const concat = require('concat-stream')
const multiparty = require('multiparty')
const assert = require('assert')
const preprocessify = require('preprocessify')
const loaders = require('../../../loaders')
const UglifyJS = require('uglify-js')
var runnerArgs = require('../runner/args')

mime.types['es6'] = 'application/javascript'

const assetsDir = path.resolve(__dirname, '../../..')

class AssetTransform {
  test(params) {
    return true
  }

  execute() {
    throw new Error('execute method of transforms must be implemented in subclasses')
  }
}

class AgentInjectorTransform extends AssetTransform {
  constructor(buildDir, assetServer, router) {
    super()
    this.buildDir = buildDir
    this.defaultAgentConfig = {}
    this.assetServer = assetServer
    this.router = router

    this.polyfills = fs.readFileSync(`${this.buildDir}/nr-polyfills.min.js`)
  }

  parseConfigFromQueryString(params) {
    if (!params.config) return
    let configString = new Buffer(params.config, 'base64').toString()
    return JSON.parse(configString)
  }

  generateConfig(loaderName, params, ssl, injectUpdatedLoaderConfig) {
    let loaderSpec = loaders.find((spec) => spec.name === loaderName)
    let payloadSuffix = loaderSpec.payload
    let payloadFilename = payloadSuffix ? `nr-${payloadSuffix}.js` : 'nr.js'

    let config = {
      agent: `${this.assetServer.host}:${this.assetServer.port}/build/${payloadFilename}`,
      beacon: `${this.assetServer.host}:${this.router.port}`,
      errorBeacon: `${this.assetServer.host}:${this.router.port}`
    }

    let overrides = this.parseConfigFromQueryString(params) || {}
    Object.assign(config, this.defaultAgentConfig, overrides)

    const loaderConfigKeys = [
      'accountID',
      'agentID',
      'applicationID',
      'licenseKey',
      'trustKey'
    ]

    const loaderOnlyConfigKeys = [
      'accountID',
      'agentID',
      'trustKey'
    ]

    let updatedConfig = {
      'info': {},
      'loaderConfig': {}
    }

    let configKeys = Object.keys(config)
    for (const key of configKeys.values()) {
      // add keys to `loader_config` - only the ones that should be there
      if (injectUpdatedLoaderConfig) {
        if (loaderConfigKeys.includes(key)) {
          // this simulates the collector injects only the primary app ID
          if (key === 'applicationID') {
            var primaryAppId = config[key].toString().split(',')[0]
            updatedConfig.loaderConfig[key] = primaryAppId
          } else {
            updatedConfig.loaderConfig[key] = config[key]
          }
        }
      }

      // add all keys to `info` except the ones that exist only in `loader_config`
      if (!loaderOnlyConfigKeys.includes(key)) {
        updatedConfig.info[key] = config[key]
      }
    }

    return updatedConfig
  }

  generateConfigString(loaderName, params, ssl, injectUpdatedLoaderConfig) {
    let config = this.generateConfig(loaderName, params, ssl, injectUpdatedLoaderConfig)
    let infoJSON = JSON.stringify(config.info)
    let loaderConfigJSON = JSON.stringify(config.loaderConfig)

    let debugShim = this.getDebugShim()
    let loaderConfigAssignment = injectUpdatedLoaderConfig ? `NREUM.loader_config=${loaderConfigJSON};` : ''

    return `window.NREUM||(NREUM={});NREUM.info=${infoJSON};${loaderConfigAssignment}${debugShim}`
  }

  generateInit(initFromQueryString) {
    let initString = new Buffer(initFromQueryString, 'base64').toString()
    return `window.NREUM||(NREUM={});NREUM.init=${initString};NREUM.init.ssl=false;`
  }

  getDebugShim() {
    if (!this.assetServer.debugShim) return ''

    return `
      window.NRDEBUG = (function() {
        var count = 0;
        return nrdebug;
        function nrdebug(msg, sync) {
          count++;
          if (typeof msg === 'object') {
            msg = JSON.stringify(msg)
          }
          var url = 'http://' + NREUM.info.beacon + '/debug?m=' + escape(msg) + '&testId=' + NREUM.info.licenseKey + '&r=' + Math.random() + '&ix=' + count
          if (!sync) {
            var img = new window.Image()
            img.src = url
            return img
          } else {
            var request = new XMLHttpRequest()
            request.open('POST', url, false)
            request.setRequestHeader('content-type', 'text/plain')
            request.send()
          }
        };
      })()
      var origOnError = window.onerror
      window.onerror = function() {
        NRDEBUG(\`error thrown: \${JSON.stringify(arguments)}\`)
        origOnError(arguments)
      }
      var origLog = window.console.log
      window.console.log = function() {
        NRDEBUG(\`console.log: \${JSON.stringify(arguments)}\`)
        origLog(arguments)
      }
      var origWarn = window.console.warn
      window.console.warn = function() {
        NRDEBUG(\`console.warn: \${JSON.stringify(arguments)}\`)
        origWarn(arguments)
      }
      var origErr = window.console.error
      window.console.error = function() {
        NRDEBUG(\`console.error: \${JSON.stringify(arguments)}\`)
        origErr(arguments)
      }
    `
  }

  getLoaderContent(loaderName, dir, callback) {
    let loaderFilename = `nr-loader-${loaderName}${runnerArgs.polyfills ? '-polyfills' : ''}.min.js`
    let loaderPath = path.join(dir, loaderFilename)
    fs.readFile(loaderPath, callback)
  }

  getBuiltPackages(pkgPaths) {
    return new Promise((resolve, reject) => {
      if (!pkgPaths || !pkgPaths.length) resolve([])
      const proms = []
      for (let i = 0; i < pkgPaths.length; i++) {
        const pkgPath = pkgPaths[i]
        const distPath = path.resolve(__dirname, `../../../${pkgPath}`)
        proms.push(fs.promises.readFile(distPath, 'utf-8'))
      }
      Promise.all(proms).then(data => {
        resolve(
          pkgPaths.map((x, i) => ({
            name: x,
            data: data[i]
          })
          ))
      }).catch(err => resolve([]))
    })
  }

  execute(params, assetPath, ssl, callback) {
    fs.readFile(assetPath, 'utf-8', async (err, rawContent) => {
      if (err) return callback(err)

      let loaderName = params.loader || this.assetServer.defaultLoader
      let injectUpdatedLoaderConfig = (params.injectUpdatedLoaderConfig === 'true')

      const htmlPackageTags = [...rawContent.matchAll(/{packages\/.*}/g)].map(x => x[0])
      const packagePaths = htmlPackageTags.map(x => x.replace(/[{}]/g, ''))
      const packageFiles = await this.getBuiltPackages(packagePaths)



      this.getLoaderContent(
        loaderName,
        this.buildDir,
        (err, loaderContent) => {
          if (err) return callback(err)

          let configContent = ''
          try {
            configContent = this.generateConfigString(loaderName, params, ssl, injectUpdatedLoaderConfig)
          } catch (e) {
            return callback(e)
          }

          let initContent = ''
          if (params.init) {
            try {
              initContent = this.generateInit(params.init)
            } catch (e) {
              return callback(e)
            }
          }

          let disableSsl = 'window.NREUM||(NREUM={});NREUM.init||(NREUM.init={});NREUM.init.ssl=false;'

          let rspData = rawContent
            .split('{loader}').join(tagify(disableSsl + loaderContent))
            .replace('{config}', tagify(disableSsl + configContent))
            .replace('{init}', tagify(disableSsl + initContent))
            .replace('{script}', `<script src="${params.script}" charset="utf-8"></script>`)

          if (runnerArgs.polyfills) {
            rspData = rspData.replace('{polyfills}', `<script type="text/javascript">${this.polyfills}</script>`)
          }

          if (!!htmlPackageTags.length && !!packageFiles.length) {
            packageFiles.forEach(pkg => {
              const tag = htmlPackageTags.find(x => x.includes(pkg.name))
              rspData = rspData
                .replace(tag, tagify(disableSsl + UglifyJS.minify(pkg.data).code))
            })
          }

          callback(null, rspData)

          function tagify(s) {
            return `<script type="text/javascript">${s}</script>`
          }
        }
      )
    })
  }
}

class BrowserifyTransform extends AssetTransform {
  constructor(config) {
    super()
    this.browserifyCache = {}
    this.config = config
  }

  test(params) {
    return params.browserify
  }

  execute(params, assetPath, ssl, callback) {
    let result = this.browserifyCache[assetPath]
    if (result) return callback(null, result)

    browserify(assetPath)
      .transform("babelify", {
        presets: [
          ["@babel/preset-env", {
            loose: true,
            targets: {
              browsers: [
                "chrome >= 60",
                "safari >= 11",
                "firefox >= 56",
                "ios >= 10.3",
                "ie >= 11",
                "edge >= 60"
              ]
            }
          }]
        ],
        plugins: ["@babel/plugin-syntax-dynamic-import", '@babel/plugin-transform-modules-commonjs'],
        global: true
      })
      .transform(preprocessify())
      .bundle((err, buf) => {
        if (err) return callback(err)

        let content = buf.toString()

        if (this.config.cache) this.browserifyCache[assetPath] = content

        callback(err, content)
      })
  }
}

class Route {
  constructor(method, glob, handler) {
    this.method = method
    this.glob = glob
    this.handler = handler
  }

  match(req) {
    if (req.method.toUpperCase() !== this.method.toUpperCase()) return false
    let path = url.parse(req.url).pathname
    return minimatch(path, this.glob)
  }

  service(req, res) {
    this.handler(req, res)
  }
}

const testRoutes = [
  new Route('GET', '/slowscript', (req, res) => {
    const params = parseParams(req)
    var abort = params.abort
    var delay = params.delay || 200

    setTimeout(() => {
      if (abort) {
        res.destroy()
        return
      }
      res.end('window.slowScriptLoaded=1')
    }, delay)
  }),
  new Route('GET', '/lazyscript', (req, res) => {
    const params = parseParams(req)
    var delay = params.delay || 0
    var content = params.content || ''
    setTimeout(() => res.end(content), delay)
  }),
  new Route('GET', '/slowimage', (req, res) => {
    const params = parseParams(req)
    var delay = params.delay || 0
    var path = resolveAssetPath('/tests/assets/images/square.png', assetsDir)
    setTimeout(() => {
      fs.createReadStream(path).pipe(res)
    }, delay)
  }),
  new Route('GET', '/abort', (req, res) => {
    setTimeout(() => res.end('foo'), 300)
  }),
  new Route('PUT', '/timeout', (req, res) => {
    setTimeout(() => res.end('foo'), 300)
  }),
  new Route('POST', '/echo', (req, res) => {
    var body = ''
    req.on('data', function (data) {
      body += data
    })
    req.on('end', function () {
      res.end(body)
    })
  }),
  new Route('GET', '/jsonp', (req, res) => {
    const params = parseParams(req)
    const cbName = params.callback || params.cb || 'callback'
    setTimeout(() => {
      if (params.plain) {
        res.setHeader('Content-Type', 'text/plain')
        res.end(cbName + '("taco")')
      } else {
        res.setHeader('Content-Type', 'text/javascript')
        res.end(cbName + '({name: "taco"})')
      }
    }, params.timeout || 0)
  }),
  new Route('GET', '/xhr_with_cat/*', (req, res) => {
    res.setHeader('X-NewRelic-App-Data', 'foo')
    res.end('xhr with CAT ' + new Array(100).join('data'))
  }),
  new Route('GET', '/xhr_no_cat', (req, res) => {
    res.end('xhr no CAT')
  }),
  new Route('GET', '/echo-headers', (req, res) => {
    res.end(JSON.stringify(req.headers))
  }),
  new Route('POST', '/postwithhi/*', (req, res) => {
    req.pipe(concat((body) => {
      if (body.toString() === 'hi!') {
        res.end('hi!')
      } else {
        res.end('bad agent! - got body = "' + body.toString() + '"')
      }
    })).on('error', (err) => {
      console.log(err)
      res.writeHead(500)
      res.end(err.stack)
    })
  }),
  new Route('GET', '/json', (req, res) => {
    res.end('{"text":"hi!"}')
  }),
  new Route('GET', '/text', (req, res) => {
    const params = parseParams(req)
    var length = params.length || 10
    res.end('x'.repeat(length))
  }),
  new Route('POST', '/formdata', (req, res) => {
    let form = new multiparty.Form()
    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500)
        res.end('failed to parse form data submission: ' + err)
        return
      }

      try {
        assert.deepEqual(fields, { name: ['bob'], x: ['5'] })
        res.end('good')
      } catch (err) {
        res.end('bad')
      }
    })
  }),
  new Route('GET', '/slowresponse', (req, res) => {
    res.writeHead(200)
    res.write('x'.repeat(8192))
    setTimeout(() => {
      res.write('y'.repeat(8192))
      res.end()
    }, 25)
  }),
  new Route('GET', '/gzipped', (req, res) => {
    res.writeHead(200, { 'Content-Encoding': 'gzip' })

    let gzip = zlib.createGzip()
    gzip.pipe(res)
    gzip.end('x'.repeat(10000))
  }),
  new Route('GET', '/chunked', (req, res) => {
    res.writeHead(200, {
      'Transfer-Encoding': 'chunked'
    })
    res.end('x'.repeat(10000))
  })
]

function parseParams(req) {
  let query = url.parse(req.url).query
  if (!query) return {}
  return querystring.parse(query)
}

function resolveAssetPath(relativePath, baseDir) {
  if (relativePath[0] === '/') relativePath = relativePath.slice(1)

  let resolvedAbsolutePath = path.resolve(baseDir, relativePath)
  if (resolvedAbsolutePath.slice(0, baseDir.length) === baseDir) {
    return resolvedAbsolutePath
  }
}

class TestServer extends BaseServer {
  constructor() {
    super()
    this.routes = testRoutes
    this.addHandler(this.serviceRequest.bind(this))
  }

  serviceRequest(req, rsp, ssl) {
    for (let route of this.routes) {
      if (route.match(req)) {
        route.service(req, rsp, ssl)
        return
      }
    }
    rsp.writeHead(404)
    rsp.end()
  }
}

class AssetServer extends BaseServer {
  constructor(testConfig, defaultAgentConfig = {}, browserTests, output, renderIndex = false) {
    super()
    this.host = testConfig.host
    this.timeout = testConfig.timeout
    this.defaultLoader = testConfig.loader
    this.debugShim = testConfig.debugShim
    this.buildDir = path.resolve(__dirname, '../../../build')
    this.assetsDir = path.resolve(__dirname, '../../..')
    this.unitTestDir = path.resolve(__dirname, '../../../tests/browser')
    this.addHandler(this.serviceRequest.bind(this))
    this.router = new Router(this, testConfig, output)
    this.agentTransform = new AgentInjectorTransform(this.buildDir, this, this.router)
    this.agentTransform.defaultAgentConfig = defaultAgentConfig
    this.browserTests = browserTests
    this.renderIndex = renderIndex

    this.corsServer = new TestServer()

    this.transformMap = {
      'text/html': this.agentTransform,
      'application/javascript': new BrowserifyTransform(testConfig)
    }
    this.tag = 'asset'
    this.logRequests = !!testConfig.logRequests
    this.routes = testRoutes
  }

  findDynamicRoute(req) {
    for (let route of this.routes) {
      if (route.match(req)) return route
    }
  }

  start(port, sslPort, routerPort = 0, routerSslPort = null) {
    this.router.start(routerPort, routerSslPort)
    this.corsServer.start(0)
    super.start(port, sslPort)
  }

  stop() {
    this.router.stop()
    this.corsServer.stop()
    super.stop()
  }

  get defaultAgentConfig() {
    return this.agentTransform.defaultAgentConfig
  }

  serviceRequest(req, rsp, ssl) {
    let parsedUrl = url.parse(req.url)

    if (parsedUrl.pathname === '/') {
      this.serveIndex(req, rsp, ssl)
    } else if (parsedUrl.pathname.slice(0, 7) === '/build/') {
      this.serveBuiltAsset(req, rsp, ssl)
    } else if (this.findDynamicRoute(req)) {
      let route = this.findDynamicRoute(req)
      route.service(req, rsp, ssl)
    } else {
      this.serveAsset(req, rsp, parsedUrl, ssl)
    }
  }

  serveBuiltAsset(req, rsp, ssl) {
    let relativePath = url.parse(req.url).pathname.replace(/^\/build/, '')
    let assetPath = resolveAssetPath(relativePath, this.buildDir)

    if (!assetPath) return rsp.end(404)

    fs.readFile(assetPath, (err, data) => {
      if (err) return this.writeError(rsp, err.toString())
      rsp.end(data)
    })
  }

  serveAsset(req, rsp, parsedUrl, ssl) {
    let assetPath = resolveAssetPath(parsedUrl.pathname, this.assetsDir)

    if (assetPath) {
      this.serveAssetFromPath(req, rsp, assetPath, ssl)
    } else {
      rsp.writeHead(404)
      rsp.end()
    }
  }

  writeError(rsp, errorMessage) {
    console.log('WRITE ERROR!')
    rsp.writeHead(500)
    rsp.end(errorMessage)
  }

  serveAssetFromPath(req, rsp, assetPath, ssl) {
    let mimeType = mime.lookup(assetPath)
    let exists = fs.existsSync(assetPath)

    if (exists) {
      let transform = this.transformMap[mimeType]
      let params = parseParams(req)

      if (!transform || !transform.test(params)) {
        rsp.writeHead(200, {
          'Content-Type': 'text/html'
        })
        return fs.createReadStream(assetPath).pipe(rsp)
      }

      transform.execute(params, assetPath, ssl, (err, transformed) => {
        if (err) return this.writeError(rsp, `Error while transforming asset ${err}: ${err.stack}`)
        rsp.writeHead(200, {
          'Content-Type': 'text/html'
        })
        rsp.end(transformed)
      })
    } else {
      rsp.writeHead(404)
      // rsp.write(`Failed to locate asset at '${assetPath}'`)
      rsp.end()
    }
  }

  serveIndex(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/html'
    })

    if (!this.generateIndex) {
      return res.end('index not rendered during test runs')
    }

    this.generateIndex((err, data) => {
      if (err) throw err
      res.end(data)
    })
  }

  generateIndex(done) {
    let server = this
    let files = this.browserTests.filter(unique).map((file) => ({
      name: path.relative(server.assetsDir, file),
      target: unitTestTarget(file)
    }))

    let remaining = 2

    if (this.cachedIndex) {
      process.nextTick(() => done(null, this.cachedIndex))
      return
    }

    ls(this.assetsDir).pipe(through((entry) => {
      if (entry.path.match('git|node_modules')) return entry.ignore
      if (entry.path.slice(-5) !== '.html') return
      files.push({
        name: path.relative(server.assetsDir, entry.path),
        target: path.relative(server.assetsDir, entry.path)
      })
    }, gotFiles))

    ls(this.unitTestDir).pipe(through((entry) => {
      if (entry.path.slice(-11) !== '.browser.js') return
      files.push({
        name: path.relative(server.assetsDir, entry.path),
        target: unitTestTarget(entry.path)
      })
    }, gotFiles))

    function unitTestTarget(file) {
      let script = `/${path.relative(server.assetsDir, file)}?browserify=true`
      return server.urlFor('/tests/assets/browser.html', {
        config: new Buffer(JSON.stringify({
          assetServerPort: server.router.assetServer.port,
          assetServerSSLPort: server.router.assetServer.sslPort,
          corsServerPort: server.corsServer.port
        })).toString('base64'),
        script: script
      })
    }

    function gotFiles() {
      if (!--remaining) buildResponse()
    }

    function buildResponse() {
      let response = '<html><head></head><body><ul>\n'
      files.forEach((entry) => {
        response += `<li><a href="${entry.target}">${entry.name}</a></li>\n`
      })
      response += '</ul></body><html>'
      server.cachedIndex = response
      done(null, response)
    }
  }

  urlFor(relativePath, options, ssl = false) {
    let query = querystring.encode(options)
    return url.resolve(
      `${ssl ? 'https' : 'http'}://${this.host}:${ssl ? this.sslPort : this.port}`,
      `${relativePath}?${query}`
    )
  }
}

function unique(item, i, list) {
  return list.indexOf(item) === i
}

module.exports = AssetServer
