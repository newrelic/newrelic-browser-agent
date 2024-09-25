import { generateSelectorPath } from '../../../../src/common/dom/selector-path'

describe('generateSelectorPath', () => {
  let div, span, p

  beforeEach(() => {
    document.body.innerHTML = `
    <html>
        <body>
            <div id="container">
                <div class="child">
                    <span class="grandchild">Text</span>
                </div>
                <div class="child">
                    <p id="target">Paragraph</p>
                </div>
            </div>
        </body>
    </html>
        `

    div = document.getElementById('container')
    span = document.querySelector('.grandchild')
    p = document.getElementById('target')
  })

  test('should generate selector path including id', () => {
    const selector = generateSelectorPath(p, { includeId: true, includeClass: false })
    expect(selector).toBe('html>body>div#container>div>p#target:nth-of-type(1)')
  })

  test('should generate selector path including class', () => {
    const selector = generateSelectorPath(span, { includeId: false, includeClass: true })
    expect(selector).toBe('html>body>div>div.child>span.grandchild:nth-of-type(1)')
  })

  test('should generate selector path including both id and class', () => {
    const selector = generateSelectorPath(span, { includeId: true, includeClass: true })
    expect(selector).toBe('html>body>div#container>div.child>span.grandchild:nth-of-type(1)')
  })

  test('should generate selector path without id and class', () => {
    const selector = generateSelectorPath(div, { includeId: false, includeClass: false })
    expect(selector).toBe('html>body>div:nth-of-type(1)')
  })

  test('should return undefined for null element', () => {
    const selector = generateSelectorPath(null, { includeId: true, includeClass: true })
    expect(selector).toBeUndefined()
  })

  test('should handle elements with siblings', () => {
    const sibling = document.createElement('div')
    document.body.appendChild(sibling)
    const selector = generateSelectorPath(sibling, { includeId: false, includeClass: false })
    expect(selector).toBe('html>body>div:nth-of-type(2)')
    document.body.removeChild(sibling)
  })

  test('should handle elements without siblings', () => {
    const singleTable = document.createElement('table')
    document.body.appendChild(singleTable)
    const selector = generateSelectorPath(singleTable, { includeId: false, includeClass: false })
    expect(selector).toBe('html>body>table:nth-of-type(1)')
    document.body.removeChild(singleTable)
  })
})
