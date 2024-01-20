import args from '../args.mjs'
import url from 'url'
import path from 'path'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default function config () {
  return {
    runner: 'local',
    maxInstances: args.concurrency || 1,
    maxInstancesPerCapability: 100,
    capabilities: [],
    logLevel: (() => {
      if (args.verbose) {
        return 'debug'
      }
      if (args.logRequests || args.debugShim) {
        return 'info'
      }
      if (args.silent) {
        return 'silent'
      }
      return 'error'
    })(),
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [
      path.resolve(__dirname, '../plugins/mocha-globals/index.mjs'),
      path.resolve(__dirname, '../plugins/browser-matcher.mjs'),
      path.resolve(__dirname, '../plugins/custom-commands.mjs'),
      [path.resolve(__dirname, '../plugins/testing-server/index.mjs'), args],
      [path.resolve(__dirname, '../plugins/istanbul.mjs'), args]
    ],
    reporters: ['spec'],
    specFileRetries: args.retry ? 1 : 0,
    specFileRetriesDeferred: true,
    framework: 'mocha',
    mochaOpts: {
      ui: 'bdd',
      timeout: args.sessionTimeout,
      retries: args.retry ? 3 : 0
    },
    autoCompileOpts: {
      babelOpts: {
        presets: [
          ['@babel/preset-env', {
            targets: {
              node: '14'
            }
          }]
        ]
      }
    }
  }
}
