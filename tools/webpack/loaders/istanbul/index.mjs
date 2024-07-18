import module from 'node:module'
import { createInstrumenter } from 'istanbul-lib-instrument'
import { validate } from 'schema-utils'
import convert from 'convert-source-map'

const require = module.createRequire(import.meta.url)
const schema = require('./options.json')

export default function (source, sourceMap) {
  const options = Object.assign({ produceSourceMap: true }, this.getOptions())

  validate(schema, options, {
    name: 'Istanbul Instrumenter Loader',
    baseDataPath: 'options'
  })

  let srcMap = sourceMap
  // use inline source map, if any
  if (!srcMap) {
    const inlineSourceMap = convert.fromSource(source)
    if (inlineSourceMap) {
      srcMap = inlineSourceMap.sourcemap
    }
  }

  const instrumenter = createInstrumenter(options)

  instrumenter.instrument(source, this.resourcePath, (error, instrumentedSource) => {
    this.callback(error, instrumentedSource, instrumenter.lastSourceMap())
  }, srcMap)
}
