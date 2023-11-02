import fs from 'fs-extra'
import path from 'path'
import url from 'url'
import args from '../args.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default function config () {
  if (!Array.isArray(args._) || args._.length === 0) {
    return {
      specs: [path.join(
        path.resolve(__dirname, '../../..'),
        args.webview ? 'tests/webview-specs/**/*.e2e.js' : 'tests/specs/**/*.e2e.js'
      )]
    }
  } else {
    return {
      specs: args._.map(testPath => {
        let parsedPath = path.join(
          path.resolve(__dirname, '../../../'), testPath
        )

        if (parsedPath.endsWith('*')) {
          return path.join(parsedPath, '*.e2e.js')
        }

        if (!fs.pathExistsSync(parsedPath)) {
          return undefined
        }

        const parsedPathStats = fs.statSync(parsedPath)
        if (parsedPathStats.isDirectory()) {
          parsedPath = path.join(parsedPath, '**/*.e2e.js')
        } else if (parsedPathStats.isFile() && !parsedPath.endsWith('.e2e.js')) {
          return undefined
        }

        return parsedPath
      }).filter(testPath => testPath !== undefined && testPath !== null)
    }
  }
}
