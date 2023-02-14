const { Transform } = require('stream')

/**
 * Constructs the worker commands script block based on the workerCommands query.
 * @param {module:fastify.FastifyRequest} request
 * @param {module:fastify.FastifyReply} reply
 * @param {TestServer} testServer
 * @return {string}
 */
function getWorkerCommandsContent (request, reply, testServer) {
  if (!request.query.workerCommands) {
    return '[]'
  }

  const workerCommands = Buffer.from(
    request.query.workerCommands,
    'base64'
  ).toString()
  return `workerCommands=${workerCommands};`
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
