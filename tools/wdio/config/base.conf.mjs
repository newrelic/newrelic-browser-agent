import jilArgs from '../args.mjs'
import url from 'url'
import path from 'path'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const buildIdentifier = ((() => {
  let buildIdentifier = process.env.BUILD_NUMBER
  if (!buildIdentifier) {
    let identifier = Math.random().toString(16).slice(2)
    buildIdentifier = `${process.env.USER}-${identifier}`
  }
  return buildIdentifier
})())

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
      path.resolve(__dirname, '../plugins/browser-matcher.mjs'),
      path.resolve(__dirname, '../plugins/jil-commands.mjs'),
      path.resolve(__dirname, '../plugins/newrelic-instrumentation.mjs'),
      [path.resolve(__dirname, '../plugins/testing-server/index.mjs'), jilArgs]
    ],
    framework: 'mocha',
    specFileRetriesDeferred: true,
    reporters: [
      'spec',
      [path.resolve(__dirname, '../plugins/newrelic-reporter.mjs'), {
        buildIdentifier
      }]
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
