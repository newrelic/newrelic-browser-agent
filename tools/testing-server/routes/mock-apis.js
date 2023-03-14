const fs = require('fs')
const path = require('path')
const fp = require('fastify-plugin')
const { PassThrough } = require('stream')
const zlib = require('zlib')
const assert = require('assert')
const { paths } = require('../constants')

/**
 * Fastify plugin to apply routes to the asset server that are used in various
 * test cases.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.get('/slowscript', (request, reply) => {
    const abort = parseInt(request.query.abort || 0, 10)
    const delay = parseInt(request.query.delay || 200, 10)

    setTimeout(() => {
      if (abort) {
        reply.raw.destroy()
        return
      }
      reply.send('window.slowScriptLoaded=1')
    }, delay)
  })
  fastify.get('/lazyscript', (request, reply) => {
    const delay = parseInt(request.query.delay || 0, 10)
    const content = request.query.content || ''

    setTimeout(() => {
      reply.send(content)
    }, delay)
  })
  fastify.get('/slowimage', (request, reply) => {
    const delay = parseInt(request.query.delay || 0, 10)

    setTimeout(() => {
      reply
        .type('image/png')
        .send(
          fs.createReadStream(
            path.join(paths.testsAssetsDir, 'images/square.png')
          )
        )
    }, delay)
  })
  fastify.get('/image', (request, reply) => {
    reply
      .type('image/png')
      .send(
        fs.createReadStream(
          path.join(paths.testsAssetsDir, 'images/square.png')
        )
      )
  })
  fastify.get('/abort', (request, reply) => {
    setTimeout(() => {
      reply.send('foo')
    }, 300)
  })
  fastify.put('/timeout', (request, reply) => {
    setTimeout(() => {
      reply.send('foo')
    }, 300)
  })
  fastify.post('/echo', (request, reply) => {
    reply.send(request.body)
  })
  fastify.get('/jsonp', (request, reply) => {
    const delay = parseInt(request.query.timeout || 0, 10)
    const cbName = request.query.callback || request.query.cb || 'callback'

    setTimeout(() => {
      if (request.query.plain) {
        reply.type('text/plain').send(cbName + '("taco")')
      } else {
        reply.type('text/javascript').send(cbName + '({name: "taco"})')
      }
    }, delay)
  })
  fastify.get('/xhr_with_cat/*', (request, reply) => {
    reply
      .header('X-NewRelic-App-Data', 'foo')
      .send('xhr with CAT ' + new Array(100).join('data'))
  })
  fastify.get('/xhr_no_cat', (request, reply) => {
    reply.send('xhr no CAT')
  })
  fastify.get('/echo-headers', (request, reply) => {
    reply.send(request.headers)
  })
  fastify.post('/postwithhi/*', (request, reply) => {
    if (request.body === 'hi!') {
      reply.send('hi!')
    } else {
      reply.send('bad agent! - got body = "' + request.body + '"')
    }
  })
  fastify.get('/json', (request, reply) => {
    reply.send({ text: 'hi!' })
  })
  fastify.get('/js', (request, reply) => {
    reply.type('text/javascript').send('console.log(\'hi\')')
  })
  fastify.get('/text', (request, reply) => {
    const length = parseInt(request.query.length || 10, 10)
    reply.send('x'.repeat(length))
  })
  fastify.post('/formdata', async (request, reply) => {
    try {
      assert.deepEqual(request.body, { name: 'bob', x: '5' })
      reply.send('good')
    } catch (e) {
      reply.send('bad')
    }
  })
  fastify.get('/slowresponse', (request, reply) => {
    const stream = new PassThrough()
    reply.send(stream)

    stream.write('x'.repeat(8192))
    setTimeout(() => {
      stream.write('y'.repeat(8192))
      stream.end()
    }, 250)
  })
  fastify.get('/gzipped', (request, reply) => {
    const stream = new PassThrough()
    reply.header('Content-Encoding', 'gzip').send(stream)

    const gzip = zlib.createGzip()
    gzip.pipe(stream)
    gzip.end('x'.repeat(10000))
  })
  fastify.get('/chunked', (request, reply) => {
    const stream = new PassThrough()
    reply.header('Transfer-Encoding', 'chunked').send(stream)

    stream.write('x'.repeat(10000))
    stream.end()
  })
  fastify.get('/web-worker-agent', async (request, reply) => {
    const contents = await fs.promises.readFile(
      path.join(paths.builtAssetsDir, 'nr-loader-worker.min.js')
    )
    reply
      .header('Content-Type', 'application/javascript; charset=UTF-8')
      .send(contents)
  })
  fastify.get('/empty404', async (request, reply) => {
    reply.code(404).send('')
  })
})
