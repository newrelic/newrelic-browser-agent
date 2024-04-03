import { isValidSelector } from '../../../../src/common/dom/query-selector'
describe('query selector tests', () => {
  test('handles nullish values', () => {
    expect(isValidSelector(null)).toEqual(false)
    expect(isValidSelector('')).toEqual(false)
    expect(isValidSelector(0)).toEqual(false)
    expect(isValidSelector(false)).toEqual(false)
  })

  test('handles truthy but invalid values', () => {
    expect(isValidSelector({ test: 1 })).toEqual(false)
    expect(isValidSelector([1, 2, 3])).toEqual(false)
    expect(isValidSelector(1)).toEqual(false)
    expect(isValidSelector(',')).toEqual(false)
    expect(isValidSelector('[invalid space]')).toEqual(false)
  })

  test('handles valid selectors', () => {
    expect(isValidSelector('#id')).toEqual(true)
    expect(isValidSelector('.class')).toEqual(true)
    expect(isValidSelector('.multiple,#selectors')).toEqual(true)
    expect(isValidSelector('[attr-selector]')).toEqual(true)
  })
})
