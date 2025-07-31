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
})
