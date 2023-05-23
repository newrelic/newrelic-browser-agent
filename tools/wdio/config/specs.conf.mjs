import path from 'path'
import url from 'url'
import args from '../args.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default function config () {
  if (!Array.isArray(args._) || args._.length === 0) {
    return {
      specs: [
        path.resolve(__dirname, '../../../tests/specs/**/*.e2e.js')
      ]
    }
  } else {
    return {
      specs: args._.map(testPath => path.join(
        path.resolve(__dirname, '../../../'), testPath
      ))
    }
  }
}
