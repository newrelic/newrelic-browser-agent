const path = require('path')
const fp = require('fastify-plugin')
const getFiles = require('../utils/get-files')
const { urlFor } = require('../utils/url')
const { paths } = require('../constants')

/**
 * Fastify plugin to build out the test server index HTML file. This will list
 * out all the test HTML pages and unit tests with appropriate links for running
 * those tests.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  let response

  fastify.get('/', {
    // do not compress the main home page of the testing server, this has weird consequences
    compress: false
  }, async (request, reply) => {
    if (!response) {
      response = '<html><head></head><body><ul>\n'

      for await (const file of getFiles(paths.testsAssetsDir)) {
        if (file.endsWith('.html')) {
          const filePath = path.relative(paths.rootDir, file)
          response += `<li><a href="${filePath}">${filePath}</a></li>\n`
        }
      }

      for await (const file of getFiles(paths.testsBrowserDir)) {
        if (file.endsWith('.browser.js')) {
          const filePath = path.relative(paths.rootDir, file)
          response += `<li><a href="${browserTestTarget(
            filePath
          )}">${filePath}</a></li>\n`
        }
      }

      response += '</ul></body><html>'
    }

    reply.code(200).type('text/html; charset=UTF-8').send(response)
  })

  function browserTestTarget (filePath) {
    return urlFor(
      '/tests/assets/browser.html',
      {
        config: {},
        script: `/${filePath}?browserify=true`
      },
      testServer
    )
  }
})
