import { wrapJsonP } from '../../../src/common/wrap/wrap-jsonp'

function removeListener (type, fn) {
  const handlers = this.listeners(type)
  var index = handlers.indexOf(fn)
  handlers.splice(index, 1)
}
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

beforeAll(() => {
  window.foo = function () {}
})
validUrls.forEach((url) => {
  shouldWork(url)
})
invalidUrls.forEach((url) => {
  shouldNotWork(url)
})

function shouldWork (url) {
  test('jsonp works with ' + url, done => {
    const jsonpEE = wrapJsonP()
    jsonpEE.removeListener = removeListener

    function listener () {
      jsonpEE.removeListener('new-jsonp', listener)
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
    const jsonpEE = wrapJsonP()
    jsonpEE.removeListener = removeListener

    const listener = function () {
      expect(true).toEqual(false) // should not have been called
    }
    jsonpEE.on('new-jsonp', listener)

    const el = window.document.createElement('script')
    el.src = url
    window.document.body.appendChild(el)

    jsonpEE.removeListener('new-jsonp', listener)
    done()
  })
}
