import { wrapHistory } from '../../../src/common/wrap/wrap-history'
import { bundleId } from '../../../src/common/ids/bundle-id'

beforeAll(() => {
  wrapHistory()
})

test('history functions are wrapped with own properties', () => {
  expect(isWrapped(window.history.pushState)).toBeTruthy()
  expect(isWrapped(window.history.replaceState)).toBeTruthy()

  expect(Object.prototype.hasOwnProperty.call(window.history, 'pushState')).toBeTruthy()
  expect(Object.prototype.hasOwnProperty.call(window.history, 'replaceState')).toBeTruthy()
})

function isWrapped (fn) {
  return fn && (typeof fn[`nr@original:${bundleId}`] === 'function')
}
