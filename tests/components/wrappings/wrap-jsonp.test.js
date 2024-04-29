import { wrapJsonP } from '../../../src/common/wrap/wrap-jsonp'
import { bundleId } from '../../../src/common/ids/bundle-id'

const validUrls = [
  '/jsonp?cb=foo',
  '/jsonp?cb=foo#abc',
  '/jsonp?callback=foo',
  '/jsonp?callback=foo#abc'
]
const invalidUrls = [
  '/jsonp?mycb=foo',
  '/jsonp?ab=1&mycb=foo',
  '/jsonp?mycallback=foo',
  '/jsonp?ab=1&mycallback=foo'
]

let jsonpEE
beforeAll(() => {
  window.foo = function () {}
  jsonpEE = wrapJsonP()
})
validUrls.forEach((url) => {
  shouldWork(url)
})
invalidUrls.forEach((url) => {
  shouldNotWork(url)
})
describe('Wrapped Node prototype', () => {
  test('functions are wrapped on HTMLElement', () => {
    expect(isWrapped(HTMLElement.prototype.appendChild)).toBeTruthy()
    expect(isWrapped(HTMLElement.prototype.insertBefore)).toBeTruthy()
    expect(isWrapped(HTMLElement.prototype.replaceChild)).toBeTruthy()

    expect(isWrapped(HTMLHeadElement.prototype.appendChild)).toBeTruthy()
    expect(isWrapped(HTMLHeadElement.prototype.insertBefore)).toBeTruthy()
    expect(isWrapped(HTMLHeadElement.prototype.replaceChild)).toBeTruthy()

    expect(isWrapped(HTMLBodyElement.prototype.appendChild)).toBeTruthy()
    expect(isWrapped(HTMLBodyElement.prototype.insertBefore)).toBeTruthy()
    expect(isWrapped(HTMLBodyElement.prototype.replaceChild)).toBeTruthy()
  })

  test('new property is not added to HTMLElement', () => {
    if (Node.prototype.appendChild) {
      expect(Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'appendChild')).toBeFalsy()
      expect(Object.prototype.hasOwnProperty.call(HTMLHeadElement.prototype, 'appendChild')).toBeFalsy()
      expect(Object.prototype.hasOwnProperty.call(HTMLBodyElement.prototype, 'appendChild')).toBeFalsy()
    }
  })
})

function shouldWork (url) {
  test('jsonp works with ' + url, done => {
    function listener () {
      jsonpEE.removeEventListener('new-jsonp', listener)
      done()
    }
    jsonpEE.on('new-jsonp', listener)

    const el = window.document.createElement('script')
    el.src = url
    window.document.body.appendChild(el)
  })
}
function shouldNotWork (url) {
  test('jsonp does not work with ' + url, done => {
    const listener = function () {
      expect(true).toEqual(false) // should not have been called
    }
    jsonpEE.on('new-jsonp', listener)

    const el = window.document.createElement('script')
    el.src = url
    window.document.body.appendChild(el)

    jsonpEE.removeEventListener('new-jsonp', listener)
    done()
  })
}
function isWrapped (fn) {
  return fn && (typeof fn[`nr@original:${bundleId}`] === 'function')
}
