import { analyzeElemPath } from '../../../../src/common/dom/selector-path'
import { interactiveElems } from '../../../../src/features/generic_events/aggregate/user-actions/interactive-elements'

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

describe('analyzeElemPath - interactive elements', () => {
  it('correctly raises internal error', () => {
    const debugSpy = jest.spyOn(console, 'debug')
    const link = document.createElement('a')
    simulateWidthAndHeight(link, undefined, undefined, () => {
      throw new Error('Simulated error')
    })
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(undefined)
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#63'), {
      element: 'A',
      error: 'Simulated error'
    })
  })
})

describe('analyzeElemPath - links', () => {
  let link
  beforeEach(() => {
    link = createLink()
  })
  afterEach(() => {
    if (link && link.parentNode) {
      document.body.removeChild(link)
    }
  })

  function createLink () {
    const link = document.createElement('a')
    link.innerHTML = 'Example Link'

    simulateWidthAndHeight(link)
    return link
  }

  test('should detect link is interactive if it has an href', () => {
    link.href = 'https://example.com'
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(true)
  })

  test('should detect interactive link if link has onclick handler', () => {
    link.onclick = () => {}
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(true)
  })

  test('should detect link as interactive if it has click handler', () => {
    document.body.appendChild(link)
    // Simulate link has a click handler
    const listener = () => {}
    interactiveElems.add(link, listener)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(true)

    interactiveElems.delete(link, listener)
  })

  test('should return hasActLink = true if any element ancestor is an interactive link', () => {
    link.href = 'https://example.com'
    const childSpan = document.createElement('span')
    link.appendChild(childSpan)
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(childSpan)
    expect(hasActLink).toBe(true)
  })

  test('should return hasActLink = false if any element ancestor is a non-interactive link', () => {
    const childSpan = document.createElement('span')
    link.appendChild(childSpan)
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(childSpan)
    expect(hasActLink).toBe(false) // is a dead click
  })

  test('should return hasActLink = undefined if no links detected in selector path', () => {
    const childSpan = document.createElement('span')
    link.appendChild(childSpan)
    document.body.appendChild(childSpan)

    const { hasActLink } = analyzeElemPath(childSpan)
    expect(hasActLink).toBe(undefined) // not a dead click
  })

  test('should not detect link as interactive if it has no href, onclick, or click handlers', () => {
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(false) // is a dead click
  })

  test('should not detect link as interactive if not visible', () => {
    link.style.display = 'none'
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(undefined) // ignored, not visible
  })

  test('should not detect link as interactive if transparent', () => {
    link.style.opacity = '0'
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(undefined) // ignored, not visible
  })

  test('should not detect link as interactive if collapsed', () => {
    link.style.visibility = 'collapse'
    document.body.appendChild(link)

    const { hasActLink } = analyzeElemPath(link)
    expect(hasActLink).toBe(undefined) // ignored, not visible
  })
})

function simulateWidthAndHeight (elem, width = 100, height = 100, getBoundingClientRect = () => {
  return {
    width,
    height,
    top: 0,
    left: 0,
    bottom: 100,
    right: 100
  }
}) {
  Object.defineProperty(elem, 'offsetWidth', {
    get: () => width
  })
  Object.defineProperty(elem, 'offsetHeight', {
    get: () => height
  })
  Object.defineProperty(elem, 'getBoundingClientRect', {
    value: getBoundingClientRect,
    configurable: true
  })
}
