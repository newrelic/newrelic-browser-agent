import { generateSelectorPath } from '../../../../src/common/dom/selector-path'

describe('generateSelectorPath', () => {
  let span, p

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

    span = document.querySelector('.grandchild')
    p = document.getElementById('target')
  })

  test('should generate selector path including id', () => {
    const selectorWithId = generateSelectorPath(p)
    expect(selectorWithId).toBe('html>body>div#container>div>p#target:nth-of-type(1)')

    const selectorWithoutId = generateSelectorPath(span)
    expect(selectorWithoutId).toBe('html>body>div#container>div>span:nth-of-type(1)')
  })

  test('should return undefined for null element', () => {
    const selector = generateSelectorPath(null)
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
