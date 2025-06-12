import { interactiveElems } from '../../../../../../src/features/generic_events/aggregate/user-actions/interactive-elements'

describe('Interactive Elements', () => {
  const lookup = interactiveElems
  it('should keep references for button', async () => {
    const button = document.createElement('button')
    const listener = () => {}
    lookup.add(button, listener)
    expect(lookup.has(button)).toBeTrue()
    expect(lookup.get(button).size).toBe(1)
  })

  it('should keep references for input, type=button', async () => {
    const button = document.createElement('input')
    button.type = 'button'
    const listener = () => {}
    lookup.add(button, listener)
    expect(lookup.has(button)).toBeTrue()
    expect(lookup.get(button).size).toBe(1)
  })

  it('should keep references for a', async () => {
    const link = document.createElement('a')
    const listener = () => {}
    lookup.add(link, listener)
    expect(lookup.has(link)).toBeTrue()
    expect(lookup.get(link).size).toBe(1)
  })

  it('should not keep references for non-interactive elements', async () => {
    const span = document.createElement('span')
    const listener = () => {}
    lookup.add(span, listener)
    expect(lookup.has(span)).toBeFalse()
  })

  it('should delete entry when listener is deleted', async () => {
    const button = document.createElement('button')
    const listener = () => {}
    lookup.add(button, listener)
    expect(lookup.has(button)).toBeTrue()
    expect(lookup.get(button).size).toBe(1)

    lookup.delete(button, listener)
    expect(lookup.has(button)).toBeFalse()
  })
})
