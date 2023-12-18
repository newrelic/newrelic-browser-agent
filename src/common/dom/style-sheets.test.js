/**
 * @jest-environment jsdom
 */

import { reinjectStylesheetAsAnonymous } from './style-sheets'

let cssScript

function createStylesheet () {
  const css = document.createElement('link')
  css.src = 'https://res.cloudinary.com/beleza-na-web/raw/upload/blz/11.102.0/main/assets/boticariostore/css/showcase.css'
  css.ref = 'stylesheet'
  css.type = 'text/css'
  css.cloneNode = jest.fn(createStylesheet)
  return css
}

describe('reinject stylesheets as anonymous', () => {
  beforeEach(() => {
    cssScript = createStylesheet()
    document.head.prepend(cssScript)
  })

  it('should inject the new node and remove the old node', async () => {
    reinjectStylesheetAsAnonymous(cssScript)
    expect(document.querySelectorAll('link').length).toEqual(1)
    expect(document.querySelector('link')).toMatchObject({
      crossOrigin: 'anonymous',
      src: cssScript.src,
      ref: cssScript.ref,
      type: cssScript.type
    })
  })
})
