const { Transform } = require('stream')
const { deserialize } = require('../../../shared/serializer')

/**
 * Constructs the worker commands script block based on the workerCommands query.
 * @param {module:fastify.FastifyRequest} request
 * @param {module:fastify.FastifyReply} reply
 * @param {TestServer} testServer
 * @return {string}
 */
function getWorkerCommandsContent (request, reply, testServer) {
  if (!request.query.workerCommands) {
    return ''
  }

  const workerCommands = (deserialize(
    Buffer.from(request.query.workerCommands, 'base64').toString()
  ) || []).map(fn =>
    // Worker commands are functions that need to be wrapped as a string,
    // so they can be passed to the web worker. The string needs to be
    // wrapped in an iife so it is self-executing when the web worker
    // evals it.
    `'(${
      fn.toString()
        .replaceAll('\'', '\\\'')
        .replaceAll('\n', '')
    })()'`
  )

  return `workerCommands=[${workerCommands.join(',')}]`
}

/**
 * Transforms requests for HTML files that contain the \{worker-commands\} string
 * with the deserialized workerCommands query param. If a workerCommands query
 * param is not provided, the string will simply be removed.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    transform (chunk, encoding, done) {
      const chunkString = chunk.toString()

      if (chunkString.indexOf('{worker-commands}') > -1) {
        const replacement = getWorkerCommandsContent(
          request,
          reply,
          testServer
        )
        done(
          null,
          chunkString.replace(
            '{worker-commands}',
            `<script type="text/javascript">${replacement}</script>`
          )
        )
      } else {
        done(null, chunkString)
      }
    }
  })
}
