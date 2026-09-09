import { addCustomAttributes, getAddStringContext } from '../../../../src/common/serialize/bel-serializer.js'
import { Obfuscator } from '../../../../src/common/util/obfuscate.js'

describe('addCustomAttributes in bel-serializer', () => {
  let addString

  beforeEach(() => {
    const rules = [{
      regex: /hello/g,
      replacement: 'foobar'
    },
    {
      regex: /world/g,
      replacement: 'foobar'
    }]
    const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
    addString = getAddStringContext(obfuscator, undefined)
  })

  test('should obfuscate attribute values but not attribute keys', () => {
    const attrs = { hello: 'world' }
    const attrParts = addCustomAttributes(attrs, { addKey: (str) => addString(str, false), addVal: addString })

    expect(attrParts).toEqual([[5, "'hello,'foobar"]])
  })
})
