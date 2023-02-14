#!/usr/bin/env node
const TestServer = require('../../testing-server');

(async () => {
  const jilArgs = (await import('../args.mjs')).default

  if (!jilArgs.timeout) jilArgs.timeout = 32000
  if (!jilArgs.port) jilArgs.port = 3333

  const server = new TestServer(jilArgs, {}, console)
  await server.start(jilArgs.port)

  const hostname = jilArgs.host
  // server.router.handle(server.config.defaultAgentConfig.licenseKey, true);

  console.log('asset server: http://' + hostname + ':' + server.assetServer.port)
  console.log('cors server: http://' + hostname + ':' + server.corsServer.port)
  console.log('bam server: http://' + hostname + ':' + server.bamServer.port)
  console.log('command server: http://' + hostname + ':' + server.commandServer.port)
})()
