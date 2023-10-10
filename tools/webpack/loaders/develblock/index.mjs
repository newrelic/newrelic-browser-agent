import { validate } from 'schema-utils'
import convert from 'convert-source-map'
import schema from './options.json' assert { type: 'json' }

const develRegex = /develblock:start[\s\S]*?develblock:end/gim

export default function (source, sourceMap) {
  const options = Object.assign({ enabled: false }, this.getOptions())

  validate(schema, options, {
    name: 'Develblock',
    baseDataPath: 'options'
  })

  if (!options.enabled) {
    return this.callback(null, source, sourceMap)
  }

  source = source.replaceAll(develRegex, '')

  let srcMap = sourceMap
  // use inline source map, if any
  if (!srcMap) {
    const inlineSourceMap = convert.fromSource(source)
    if (inlineSourceMap) {
      srcMap = inlineSourceMap.sourcemap
    }
  }

  return this.callback(null, source, sourceMap)
}
