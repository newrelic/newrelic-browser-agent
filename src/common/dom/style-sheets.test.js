/**
 * @jest-environment jsdom
 */

import { reinjectStylesheetAsAnonymous } from './style-sheets'

let cssScript
const cloner = jest.fn(createStylesheet)

function createStylesheet () {
  const css = document.createElement('link')
  css.src = 'https://res.cloudinary.com/beleza-na-web/raw/upload/blz/11.102.0/main/assets/boticariostore/css/showcase.css'
  css.ref = 'stylesheet'
  css.type = 'text/css'
  css.cloneNode = cloner
  return css
}

describe('reinject stylesheets as anonymous', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cssScript = createStylesheet()
    document.head.prepend(cssScript)
  })

  it('should clone the old node | inject the new node | remove the old node', async () => {
    reinjectStylesheetAsAnonymous(cssScript)
    expect(cloner).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('link').length).toEqual(1)
    expect(document.querySelector('link')).toMatchObject({
      crossOrigin: 'anonymous',
      src: cssScript.src,
      ref: cssScript.ref,
      type: cssScript.type
    })
  })
})
