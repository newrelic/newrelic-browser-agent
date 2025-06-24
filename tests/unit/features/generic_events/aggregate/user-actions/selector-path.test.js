import { analyzeElemPath } from '../../../../../../src/features/generic_events/aggregate/user-actions/selector-path'
import { interactiveElems } from '../../../../../../src/features/generic_events/aggregate/user-actions/interactive-elements'

const targetFields = ['id', 'className', 'tagName', 'type']

describe('analyzeElemPath', () => {
  let span, p

  beforeEach(() => {
    document.body.innerHTML = `
    <html>
        <body>
            <div id="container" class="container">
                <div class="child">
                    <span class="grandchild">Text</span>
                </div>
                <div>
                    <p id="target">Paragraph</p>
                </div>
            </div>
        </body>
    </html>
        `

    span = document.querySelector('.grandchild')
    p = document.getElementById('target')
  })

  test('should generate selector path including id', () => {
    const { path: selectorWithId } = analyzeElemPath(p, targetFields)
    expect(selectorWithId).toBe('html>body>div#container>div>p#target:nth-of-type(1)')

    const { path: selectorWithoutId } = analyzeElemPath(span)
    expect(selectorWithoutId).toBe('html>body>div#container>div>span:nth-of-type(1)')
  })

  test('should generate nearestFields', () => {
    // should get the id from <p>, tagName from <p> and class from <div>
    const { nearestFields } = analyzeElemPath(p, targetFields)
    expect(nearestFields).toMatchObject({ nearestId: 'target', nearestTag: 'P', nearestClass: 'container' })

    const { path: selectorWithoutId } = analyzeElemPath(span)
    expect(selectorWithoutId).toBe('html>body>div#container>div>span:nth-of-type(1)')
  })

  test('should return undefined for null element', () => {
    const { path: selector } = analyzeElemPath(null)
    expect(selector).toBeUndefined()
  })

  test('should handle elements with siblings', () => {
    const sibling = document.createElement('div')
    document.body.appendChild(sibling)
    const { path: selector } = analyzeElemPath(sibling, targetFields)
    expect(selector).toBe('html>body>div:nth-of-type(2)')
    document.body.removeChild(sibling)
  })

  test('should handle elements without siblings', () => {
    const singleTable = document.createElement('table')
    document.body.appendChild(singleTable)
    const { path: selector, nearestFields } = analyzeElemPath(singleTable)
    expect(selector).toBe('html>body>table:nth-of-type(1)')
    expect(nearestFields).toEqual({})
    document.body.removeChild(singleTable)
  })
})

describe('analyzeElemPath - links', () => {
  let link
  beforeEach(() => {
    link = document.createElement('a')
    link.innerHTML = 'Example Link'
  })
  afterEach(() => {
    if (link && link.parentNode) {
      document.body.removeChild(link)
    }
  })

  test('should detect link is interactive if it has an href', () => {
    link.href = 'https://example.com'
    document.body.appendChild(link)

    const { hasLink, hasInteractiveElems } = analyzeElemPath(link)
    expect(hasLink).toBe(true)
    expect(hasInteractiveElems).toBe(true)
  })

  test('should detect interactive link if link has onclick handler', () => {
    link.onclick = () => {}
    document.body.appendChild(link)

    const { hasLink, hasInteractiveElems } = analyzeElemPath(link)
    expect(hasLink).toBe(true)
    expect(hasInteractiveElems).toBe(true)
  })

  test('should detect link as interactive if it has click handler', () => {
    document.body.appendChild(link)
    // Simulate link has a click handler
    const listener = () => {}
    interactiveElems.add(link, listener)

    const { hasLink, hasInteractiveElems } = analyzeElemPath(link)
    expect(hasLink).toBe(true)
    expect(hasInteractiveElems).toBe(true)

    interactiveElems.delete(link, listener)
  })

  test('should return hasInteractiveElems = true if any element ancestor is an interactive link', () => {
    link.href = 'https://example.com'
    const childSpan = document.createElement('span')
    link.appendChild(childSpan)
    document.body.appendChild(link)

    const { hasLink, hasInteractiveElems } = analyzeElemPath(childSpan)
    expect(hasLink).toBe(true)
    expect(hasInteractiveElems).toBe(true)
  })

  test('should return hasInteractiveElems = false if any element ancestor is a non-interactive link', () => {
    const childSpan = document.createElement('span')
    link.appendChild(childSpan)
    document.body.appendChild(link)

    const { hasLink, hasInteractiveElems } = analyzeElemPath(childSpan)
    expect(hasLink).toBe(true)
    expect(hasInteractiveElems).toBe(false)
  })

  test('should return hasInteractiveElems = false if no links detected in selector path', () => {
    const childSpan = document.createElement('span')
    document.body.appendChild(childSpan)

    const { hasLink, hasInteractiveElems } = analyzeElemPath(childSpan)
    expect(hasLink).toBe(false)
    expect(hasInteractiveElems).toBe(false)
  })

  test('should not detect link as interactive if it has no href, onclick, or click handlers', () => {
    document.body.appendChild(link)

    const { hasLink, hasInteractiveElems } = analyzeElemPath(link)
    expect(hasLink).toBe(true)
    expect(hasInteractiveElems).toBe(false)
  })
})

describe('analyzeElemPath - textboxes', () => {
  let textbox
  beforeEach(() => {
    textbox = document.createElement('input')
    textbox.type = 'text'
  })
  afterEach(() => {
    if (textbox && textbox.parentNode) {
      document.body.removeChild(textbox)
    }
  })

  test('should detect textbox as interactive if it is not read-only', () => {
    document.body.appendChild(textbox)

    const {
      hasTextbox,
      hasInteractiveElems
    } = analyzeElemPath(textbox)
    expect(hasTextbox).toBe(true)
    expect(hasInteractiveElems).toBe(true)
  })

  test('should not detect textbox as interactive if it is read-only', () => {
    textbox.readOnly = true
    document.body.appendChild(textbox)

    const {
      hasTextbox,
      hasInteractiveElems
    } = analyzeElemPath(textbox)
    expect(hasTextbox).toBe(true)
    expect(hasInteractiveElems).toBe(false)
  })

  test('should return hasInteractiveElems = false if no textboxes detected in selector path', () => {
    const childSpan = document.createElement('span')
    document.body.appendChild(childSpan)

    const {
      hasTextbox,
      hasInteractiveElems
    } = analyzeElemPath(childSpan)
    expect(hasTextbox).toBe(false)
    expect(hasInteractiveElems).toBe(false)
  })
})
