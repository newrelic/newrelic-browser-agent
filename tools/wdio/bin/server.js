#!/usr/bin/env node
const TestServer = require('../../testing-server');

(async () => {
  const args = (await import('../args.mjs')).default

  if (!args.timeout) args.timeout = 32000
  if (!args.port) args.port = 3333

  const server = new TestServer(args, {}, console)
  await server.start(args.port)

  const hostname = args.host
  // server.router.handle(server.config.defaultAgentConfig.licenseKey, true);

  console.log('asset server: http://' + hostname + ':' + server.assetServer.port)
  console.log('cors server: http://' + hostname + ':' + server.corsServer.port)
  console.log('bam server: http://' + hostname + ':' + server.bamServer.port)
  console.log('command server: http://' + hostname + ':' + server.commandServer.port)
})()
