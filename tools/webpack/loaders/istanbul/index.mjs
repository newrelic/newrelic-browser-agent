import { createInstrumenter } from 'istanbul-lib-instrument'
import loaderUtils from 'loader-utils'
import validateOptions from 'schema-utils'
import convert from 'convert-source-map'
import schema from './options.json' assert { type: "json" }

export default function (source, sourceMap) {
  const options = Object.assign({ produceSourceMap: true }, loaderUtils.getOptions(this))

  validateOptions(schema, options, {
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
