const fs = require('fs-extra')
const path = require('path')
const fp = require('fastify-plugin')
const { PassThrough } = require('stream')
const zlib = require('zlib')
const assert = require('assert')
const FormData = require('form-data')
const { paths } = require('../constants')
const { retrieveReplayData } = require('../utils/replay-buffer')

/**
 * Fastify plugin to apply routes to the asset server that are used in various
 * test cases.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  // Proxy endpoints
  fastify.route({
    method: ['GET', 'POST'],
    url: '/beacon/*',
    onRequest: async (request, reply) => {
      request.raw.url = request.raw.url.replace('/beacon/', '/')
      testServer.bamServer.server.routing(request.raw, reply.raw)
      await reply
    },
    handler: async function (request, reply) {
      await reply
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/assets/*',
    onRequest: async (request, reply) => {
      request.raw.url = request.raw.url.replace('/assets/', '/build/')
      testServer.assetServer.server.routing(request.raw, reply.raw)
      await reply
    },
    handler: async function (request, reply) {
      await reply
    }
  })

  fastify.get('/health', async function (request, reply) {
    reply.code(204).send()
  })
  fastify.route({
    method: ['GET', 'PUT', 'POST', 'PATCH'],
    url: '/delayed',
    handler: function (request, reply) {
      const delay = parseInt(request.query.delay || 500, 10)

      setTimeout(() => {
        reply.send('foobar')
      }, delay)
    }
  })
  fastify.route({
    method: ['GET', 'PUT', 'POST', 'PATCH'],
    url: '/streamed',
    handler: function (request, reply) {
      const count = parseInt(request.query.count || 5, 10)

      const stream = new PassThrough()
      reply.send(stream)

      let round = 0
      const interval = setInterval(() => {
        round += 1
        stream.write('x'.repeat(8192))

        if (round >= count) clearInterval(interval)
      })
    }
  })
  fastify.get('/slowscript', {
    compress: false
  }, (request, reply) => {
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
  fastify.get('/lazyscript', {
    compress: false
  }, (request, reply) => {
    const delay = parseInt(request.query.delay || 0, 10)
    const content = request.query.content || ''

    setTimeout(() => {
      reply.send(content)
    }, delay)
  })
  fastify.get('/slowimage', {
    compress: false
  }, (request, reply) => {
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
  fastify.get('/image', {
    compress: false
  }, (request, reply) => {
    reply
      .type('image/png')
      .send(
        fs.createReadStream(
          path.join(paths.testsAssetsDir, 'images/square.png')
        )
      )
  })
  fastify.get('/abort', {
    compress: false
  }, (request, reply) => {
    setTimeout(() => {
      reply.send('foo')
    }, 300)
  })
  fastify.put('/timeout', {
    compress: false
  }, (request, reply) => {
    setTimeout(() => {
      reply.send('foo')
    }, 300)
  })
  fastify.post('/echo', {
    compress: false
  }, (request, reply) => {
    reply.send(request.body)
  })

  fastify.get('/jsonp', {
    compress: false
  }, (request, reply) => {
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
  fastify.get('/xhr_with_cat/*', {
    compress: false
  }, (request, reply) => {
    reply
      .header('X-NewRelic-App-Data', 'bar, foo')
      .send('xhr with CAT ' + new Array(100).join('data'))
  })
  fastify.get('/xhr_no_cat', {
    compress: false
  }, (request, reply) => {
    reply.send('xhr no CAT')
  })
  fastify.get('/echo-headers', {
    compress: false
  }, (request, reply) => {
    reply.send(request.headers)
  })
  fastify.post('/postwithhi/*', {
    compress: false
  }, (request, reply) => {
    if (request.body === 'hi!') {
      reply.send('hi!')
    } else {
      reply.send('bad agent! - got body = "' + request.body + '"')
    }
  })
  fastify.get('/json', {
    compress: false
  }, (request, reply) => {
    reply.send({ text: 'hi!' })
  })
  fastify.post('/json', {
    compress: false
  }, (request, reply) => {
    reply.code(500).send({ text: 'hi!' })
  })
  fastify.post('/gql', {
    compress: false
  }, (request, reply) => {
    reply.send({
      data: {
        text: 'hi',
        locations: 'test locations',
        description: 'test description'
      }
    })
  })
  fastify.get('/js', {
    compress: false
  }, (request, reply) => {
    reply.type('text/javascript').send('console.log(\'hi\')')
  })
  fastify.get('/text', {
    compress: false
  }, (request, reply) => {
    reply.send('abc123')
  })
  fastify.post('/formdata', {
    compress: false
  }, async (request, reply) => {
    const results = new FormData()

    try {
      assert.strictEqual(request.body.name.value, 'bob')
      assert.strictEqual(request.body.x.value, '5')

      results.append('result', 'good')
    } catch (e) {
      // The api expects specific key/value pairs and returns a `bad` result otherwise
      results.append('result', 'bad')
    }

    reply.header('content-type', `multipart/form-data; boundary=${results.getBoundary()}`)
    reply.send(results.getBuffer())
  })
  fastify.get('/slowresponse', {
    compress: false
  }, (request, reply) => {
    const stream = new PassThrough()
    reply.send(stream)

    stream.write('x'.repeat(8192))
    setTimeout(() => {
      stream.write('y'.repeat(8192))
      stream.end()
    }, 250)
  })
  fastify.get('/gzipped', {
    compress: false
  }, (request, reply) => {
    const stream = new PassThrough()
    reply.header('Content-Encoding', 'gzip').send(stream)

    const gzip = zlib.createGzip()
    gzip.pipe(stream)
    gzip.end('x'.repeat(10000))
  })
  fastify.get('/chunked', {
    compress: false
  }, (request, reply) => {
    const stream = new PassThrough()
    reply.header('Transfer-Encoding', 'chunked').send(stream)

    stream.write('x'.repeat(10000))
    stream.end()
  })
  fastify.get('/empty404', {
    compress: false
  }, async (request, reply) => {
    reply.code(404).send('')
  })
  fastify.get('/dt/*', {
    compress: false
  }, (request, reply) => {
    reply.code(200).send('')
  })
  fastify.get('/session-replay', async (request, reply) => {
    const replayData = await retrieveReplayData(request.query.sessionId)
    if (replayData) {
      reply.code(200)
      return replayData
    } else {
      reply.code(404)
      return ''
    }
  })
  fastify.get('/websocket', {
    websocket: true
  }, (socket, req) => {
    socket.on('message', message => {
      // message.toString() === 'hi from client'
      socket.send(`hi - ${message} - We saw you on the server`)
    })
  })

  // WebSocket endpoint that echoes back all data types for testing
  fastify.get('/websocket-echo', {
    websocket: true
  }, (socket, req) => {
    socket.on('message', (message, isBinary) => {
      // Echo back the message exactly as received
      // For binary data (ArrayBuffer, Blob, TypedArray, DataView), send as binary
      // For text data (string), send as text
      socket.send(message, { binary: isBinary })
    })
  })
})
