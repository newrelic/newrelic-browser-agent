import url from 'url'
import path from 'path'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

/**
 * This is a WDIO worker plugin that injects a global mocha setup and teardown
 * script into each spawned WDIO worker.
 */
export default class TestingServerWorker {
  beforeSession (config, _, specs) {
    config.specs.unshift(
      'file://' + path.resolve(__dirname, 'globals.mjs')
    )
    specs.unshift('file://' + path.resolve(__dirname, 'globals.mjs'))
  }
}
