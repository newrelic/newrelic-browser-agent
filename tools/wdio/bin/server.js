#!/usr/bin/env node
const TestServer = require('../../testing-server')

process.on('unhandledRejection', (error, p) => {
  console.error(error)
});

(async () => {
  const args = (await import('../args.mjs')).default

  if (!args.timeout) args.timeout = 32000
  if (!args.port) args.port = 3333
  // Port is -1 when server is started from a running WDIO instance
  if (args.port === -1) args.port = 0

  const server = new TestServer(args)
  await server.start(args.port)

  const hostname = args.host

  console.log(`asset server: http://${hostname}:${server.assetServer.port}`)
  console.log(`bam server: http://${hostname}:${server.bamServer.port}`)
  console.log(`command server: http://${hostname}:${server.commandServer.port}`)

  if (process.send) {
    try {
      process.send({
        assetServer: { hostname, port: server.assetServer.port },
        bamServer: { hostname, port: server.bamServer.port },
        commandServer: { hostname, port: server.commandServer.port }
      })
    } catch (err) {
      console.error(err)
      process.exit(1)
    }
  }
})()
