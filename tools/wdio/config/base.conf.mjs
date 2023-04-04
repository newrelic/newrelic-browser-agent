import jilArgs from '../args.mjs'
import url from 'url'
import path from 'path'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default function config () {
  return {
    runner: 'local',
    maxInstances: jilArgs.concurrency || 1,
    maxInstancesPerCapability: 100,
    capabilities: [],
    logLevel: jilArgs.verbose ? 'debug' : jilArgs.silent ? 'silent' : 'error',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [
      path.resolve(__dirname, '../plugins/jil-commands.mjs'),
      path.resolve(__dirname, '../plugins/newrelic-instrumentation.mjs'),
      [path.resolve(__dirname, '../plugins/testing-server/index.mjs'), jilArgs]
    ],
    framework: 'mocha',
    specFileRetriesDeferred: true,
    reporters: [
      'spec',
      path.resolve(__dirname, '../plugins/newrelic-reporter.mjs')
    ],
    mochaOpts: {
      ui: 'bdd',
      timeout: 60000,
      retries: jilArgs.retry ? 3 : 0
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
