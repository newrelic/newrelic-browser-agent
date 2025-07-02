import { interactiveElems } from '../../../../../../src/features/generic_events/aggregate/user-actions/interactive-elements'
import { isInteractiveElement } from '../../../../../../src/features/generic_events/aggregate/user-actions/interactive-utils'

describe('Interactive Elements - lookup for elem click event listeners', () => {
  const lookup = interactiveElems
  it('should keep entry for button', async () => {
    const button = document.createElement('button')
    const listener = () => {}
    lookup.add(button, listener)
    expect(lookup.has(button)).toBeTrue()
    expect(lookup.get(button).size).toBe(1)
  })

  it('should keep entry for input, type=button', async () => {
    const button = document.createElement('input')
    button.type = 'button'
    const listener = () => {}
    lookup.add(button, listener)
    expect(lookup.has(button)).toBeTrue()
    expect(lookup.get(button).size).toBe(1)
  })

  it('should keep entry for link', async () => {
    const link = document.createElement('a')
    const listener = () => {}
    lookup.add(link, listener)
    expect(lookup.has(link)).toBeTrue()
    expect(lookup.get(link).size).toBe(1)
  })

  // only buttons and links are considered interactive
  it('should not keep entry for non-interactive elements', async () => {
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

describe('isInteractiveElement - links', () => {
  it('should return true for link with href', () => {
    const link = document.createElement('a')
    link.href = 'https://example.com'
    expect(isInteractiveElement(link)).toBe(true)
  })

  it('should return true for link with onclick', () => {
    const link = document.createElement('a')
    link.onclick = () => {}
    expect(isInteractiveElement(link)).toBe(true)
  })

  it('should return true for link with click event listener', () => {
    const link = document.createElement('a')
    const listener = () => {}
    interactiveElems.add(link, listener)
    expect(isInteractiveElement(link)).toBe(true)

    // clean up
    interactiveElems.delete(link, listener)
  })

  it('should return false for non-interactive link without href or click handler', () => {
    const link = document.createElement('a')
    expect(isInteractiveElement(link)).toBe(false)
  })
})

describe('isInteractiveElement - textboxes', () => {
  it('should return true for normal textbox', () => {
    const input = document.createElement('input')
    input.type = 'text'
    expect(isInteractiveElement(input)).toBe(true)
  })
  it('should return false for readonly textbox', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.readOnly = true
    expect(isInteractiveElement(input)).toBe(false)
  })
})

describe('isInteractiveElement - buttons', () => {
  it('should return true for button with onclick', () => {
    const button = document.createElement('button')
    button.onclick = () => {}
    expect(isInteractiveElement(button)).toBe(true)
  })
  it('should return true for button with click event listener', () => {
    const button = document.createElement('button')
    const listener = () => {}
    interactiveElems.add(button, listener)
    expect(isInteractiveElement(button)).toBe(true)

    // clean up
    interactiveElems.delete(button, listener)
  })
  it('should return false for button without onclick or click event listener, and not associated with anything else', () => {
    const button = document.createElement('button')
    expect(isInteractiveElement(button)).toBe(false)
  })
  it('should return true for button that is a descendant of a form', () => {
    const form = document.createElement('form')
    const button = document.createElement('button')
    form.appendChild(button)
    document.body.appendChild(form)
    expect(isInteractiveElement(button)).toBe(true)
  })
  it('should return true for button that is associated with a form', () => {
    const form = document.createElement('form')
    form.id = 'test-form'
    const button = document.createElement('button')
    button.setAttribute('form', 'test-form') // associate button with form
    document.body.appendChild(button)
    document.body.appendChild(form)
    expect(isInteractiveElement(button)).toBe(true)
  })
  it('should return false for button with a form ancestor and a bad override form value', () => {
    const form = document.createElement('form')
    form.id = 'test-form'
    const button = document.createElement('button')
    button.setAttribute('form', 'does-not-exist')
    form.appendChild(button)
    document.body.appendChild(form)
    expect(isInteractiveElement(button)).toBe(false)
  })
  it('should return true for button associated with a popover', () => {
    const button = document.createElement('button')
    const popover = document.createElement('div')
    button.popoverTargetElement = popover // simulate a popover association
    expect(isInteractiveElement(button)).toBe(true)
  })
  it('should return true for button that will show a popover, if popover is currently hidden', () => {
    const button = document.createElement('button')
    const popover = document.createElement('div')
    popover.style.display = 'none' // simulate a hidden popover
    button.popoverTargetElement = popover
    button.popoverTargetAction = 'show' // simulate action to show popover
    expect(isInteractiveElement(button)).toBe(true)
  })
  it('should return false for button that will show a popover, if popover is already visible', () => {
    const button = document.createElement('button')
    const popover = document.createElement('div')
    popover.style.display = 'block' // simulate a visible popover
    button.popoverTargetElement = popover
    button.popoverTargetAction = 'show' // simulate action to show popover
    expect(isInteractiveElement(button)).toBe(false)
  })
  it('should return true for button that will hide a popover, if popover is currently visible', () => {
    const button = document.createElement('button')
    const popover = document.createElement('div')
    popover.style.display = 'block' // simulate a visible popover
    button.popoverTargetElement = popover
    button.popoverTargetAction = 'hide' // simulate action to hide popover
    expect(isInteractiveElement(button)).toBe(true)
  })
  it('should return false for button that will hide a popover, if popover is already hidden', () => {
    const button = document.createElement('button')
    const popover = document.createElement('div')
    popover.style.display = 'none' // simulate a hidden popover
    button.popoverTargetElement = popover
    button.popoverTargetAction = 'hide' // simulate action to hide popover
    expect(isInteractiveElement(button)).toBe(false)
  })
  it('should return true for button associated with toggling a popover', () => {
    const button = document.createElement('button')
    const popover = document.createElement('div')
    button.popoverTargetElement = popover // simulate a popover association

    button.popoverTargetAction = 'toggle' // simulate action to toggle popover
    popover.style.display = 'none' // simulate a hidden popover
    expect(isInteractiveElement(button)).toBe(true)
    popover.style.display = 'block' // simulate a visible popover
    expect(isInteractiveElement(button)).toBe(true)

    button.popoverTargetAction = 'foo' // any value other than 'hide' or 'show' will toggle popover
    popover.style.display = 'none' // simulate a hidden popover
    expect(isInteractiveElement(button)).toBe(true)
    popover.style.display = 'block' // simulate a visible popover
    expect(isInteractiveElement(button)).toBe(true)
  })
  it('should return false for button with a popover target that does not exist', () => {
    const button = document.createElement('button')
    button.popoverTargetElement = null // simulate a non-existent popover
    expect(isInteractiveElement(button)).toBe(false)
  })

  // Note: Currently, buttons used for commands are not explicitly handled and will not be considered interactive.
  it('should return false for button associated with a command', () => {
    const button = document.createElement('button')

    // simulate a command association
    button.setAttribute('commandfor', 'some-dialog')
    button.setAttribute('command', 'close')

    expect(isInteractiveElement(button)).toBe(false)
  })
})

describe('isInteractiveElement - input buttons', () => {
  it('should return true for input button with onclick', () => {
    const input = document.createElement('input')
    input.type = 'button'
    input.onclick = () => {}
    expect(isInteractiveElement(input)).toBe(true)
  })
  it('should return true for input button with click event listener', () => {
    const input = document.createElement('input')
    input.type = 'button'
    const listener = () => {}
    interactiveElems.add(input, listener)
    expect(isInteractiveElement(input)).toBe(true)

    // clean up
    interactiveElems.delete(input, listener)
  })
  it('should return false for input button without onclick or click event listener', () => {
    const input = document.createElement('input')
    input.type = 'button'
    expect(isInteractiveElement(input)).toBe(false)
  })
})
