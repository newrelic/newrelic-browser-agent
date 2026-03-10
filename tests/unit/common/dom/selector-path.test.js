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

  test('should detect MFE targets from data-nr-mfe-id attribute', () => {
    const mockAgentRef = {
      runtime: {
        registeredEntities: [
          {
            metadata: {
              target: {
                id: 'mfe-123',
                name: 'Test MFE',
                type: 'MFE'
              }
            }
          }
        ]
      },
      init: {
        api: {
          duplicate_registered_data: false
        }
      }
    }

    const div = document.createElement('div')
    div.dataset.nrMfeId = 'mfe-123'
    const childSpan = document.createElement('span')
    div.appendChild(childSpan)
    document.body.appendChild(div)

    const { targets } = analyzeElemPath(childSpan, targetFields, mockAgentRef)
    
    expect(targets).toHaveLength(1)
    expect(targets[0]).toEqual({
      id: 'mfe-123',
      name: 'Test MFE',
      type: 'MFE'
    })

    document.body.removeChild(div)
  })

  test('should collect multiple MFE targets from nested elements', () => {
    const mockAgentRef = {
      runtime: {
        registeredEntities: [
          {
            metadata: {
              target: {
                id: 'mfe-1',
                name: 'MFE 1',
                type: 'MFE'
              }
            }
          },
          {
            metadata: {
              target: {
                id: 'mfe-2',
                name: 'MFE 2',
                type: 'MFE'
              }
            }
          }
        ]
      },
      init: {
        api: {
          duplicate_registered_data: false
        }
      }
    }

    const outerDiv = document.createElement('div')
    outerDiv.dataset.nrMfeId = 'mfe-1'
    const innerDiv = document.createElement('div')
    innerDiv.dataset.nrMfeId = 'mfe-2'
    const childSpan = document.createElement('span')
    
    innerDiv.appendChild(childSpan)
    outerDiv.appendChild(innerDiv)
    document.body.appendChild(outerDiv)

    const { targets } = analyzeElemPath(childSpan, targetFields, mockAgentRef)
    
    expect(targets).toHaveLength(2)
    expect(targets.map(t => t.id)).toContain('mfe-1')
    expect(targets.map(t => t.id)).toContain('mfe-2')

    document.body.removeChild(outerDiv)
  })

  test('should include undefined target when no MFE detected', () => {
    const mockAgentRef = {
      runtime: {
        registeredEntities: []
      },
      init: {
        api: {
          duplicate_registered_data: false
        }
      }
    }

    const div = document.createElement('div')
    document.body.appendChild(div)

    const { targets } = analyzeElemPath(div, targetFields, mockAgentRef)
    
    expect(targets).toHaveLength(1)
    expect(targets[0]).toBeUndefined()

    document.body.removeChild(div)
  })

  test('should include undefined target when duplicate_registered_data is true', () => {
    const mockAgentRef = {
      runtime: {
        registeredEntities: [
          {
            metadata: {
              target: {
                id: 'mfe-123',
                name: 'Test MFE',
                type: 'MFE'
              }
            }
          }
        ]
      },
      init: {
        api: {
          duplicate_registered_data: true
        }
      }
    }

    const div = document.createElement('div')
    div.dataset.nrMfeId = 'mfe-123'
    document.body.appendChild(div)

    const { targets } = analyzeElemPath(div, targetFields, mockAgentRef)
    
    expect(targets).toHaveLength(2)
    expect(targets.map(t => t?.id)).toContain('mfe-123')
    expect(targets).toContain(undefined)

    document.body.removeChild(div)
  })
})
