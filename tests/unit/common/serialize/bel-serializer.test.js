import { addCustomAttributes, getAddStringContext } from '../../../../src/common/serialize/bel-serializer'

describe('addCustomAttributes', () => {
  test('keeps attribute keys raw while obfuscating only values', () => {
    const obfuscator = {
      obfuscateString: jest.fn(str => str.replace(/a/g, ''))
    }
    const addString = getAddStringContext(obfuscator)

    const attrParts = addCustomAttributes({
      'ajaxRequest.id': 'alpha',
      nested: {
        'ajaxRequest.id': 'alpha'
      }
    }, addString, obfuscator)

    const serialized = attrParts.map(([, value]) => value).join(';')

    expect(serialized).toContain('ajaxRequest.id')
    expect(serialized).toContain('nested')
    expect(serialized).toContain('lph')
    expect(serialized).not.toContain('jxxRequest.id')
    expect(serialized).not.toContain('alpha')
  })
})
