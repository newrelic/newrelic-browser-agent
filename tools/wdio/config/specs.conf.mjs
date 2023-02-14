import path from 'path'
import url from 'url'
import jilArgs from '../args.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default function config () {
  if (!Array.isArray(jilArgs._) || jilArgs._.length === 0) {
    return {
      specs: [
        path.resolve(__dirname, '../../../tests/specs/**/*.e2e.js')
      ]
    }
  } else {
    return {
      specs: jilArgs._.map(testPath => path.resolve(
        path.resolve(__dirname, '../../../'), testPath
      ))
    }
  }
}
