import { analyzeElemPath } from '../../../../src/common/dom/selector-path'

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

  test('should return hasLink = true if an <a> element is in the path', () => {
    const link = document.createElement('A')
    const childSpan = document.createElement('SPAN')
    document.body.appendChild(link)
    link.appendChild(childSpan)
    const { hasLink } = analyzeElemPath(childSpan, targetFields)
    expect(hasLink).toBe(true)
    document.body.removeChild(link)
  })

  test('should return hasButton = true if a <button> element is in the path', () => {
    const button = document.createElement('BUTTON')
    const childSpan = document.createElement('SPAN')
    document.body.appendChild(button)
    button.appendChild(childSpan)
    const { hasButton } = analyzeElemPath(childSpan, targetFields)
    expect(hasButton).toBe(true)
    document.body.removeChild(button)
  })

  test('should return hasButton = true if an <input type="button"> element is in the path', () => {
    const inputButton = document.createElement('INPUT')
    inputButton.type = 'button'
    const childSpan = document.createElement('SPAN')
    document.body.appendChild(inputButton)
    inputButton.appendChild(childSpan)
    const { hasButton } = analyzeElemPath(childSpan, targetFields)
    expect(hasButton).toBe(true)
    document.body.removeChild(inputButton)
  })
})
