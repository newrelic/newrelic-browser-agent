/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const { setup } = require('./utils/setup')
const { wrapJsonP } = require('../../src/common/wrap/wrap-jsonp')
const { baseEE } = setup()

jil.browserTest('functions are wrapped', function (t) {
  t.plan(9)
  // wrap
  wrapJsonP(baseEE)

  t.ok(isWrapped(HTMLElement.prototype.appendChild), 'appendChild is wrapped on HTMLElement')
  t.ok(isWrapped(HTMLElement.prototype.insertBefore), 'insertBefore is wrapped on HTMLElement')
  t.ok(isWrapped(HTMLElement.prototype.replaceChild), 'replaceChild is wrapped on HTMLElement')

  t.ok(isWrapped(HTMLHeadElement.prototype.appendChild), 'appendChild is wrapped on HTMLHeadElement')
  t.ok(isWrapped(HTMLHeadElement.prototype.insertBefore), 'insertBefore is wrapped on HTMLHeadElement')
  t.ok(isWrapped(HTMLHeadElement.prototype.replaceChild), 'replaceChild is wrapped on HTMLHeadElement')

  t.ok(isWrapped(HTMLBodyElement.prototype.appendChild), 'appendChild is wrapped on HTMLBodyElement')
  t.ok(isWrapped(HTMLBodyElement.prototype.insertBefore), 'insertBefore is wrapped on HTMLBodyElement')
  t.ok(isWrapped(HTMLBodyElement.prototype.replaceChild), 'replaceChild is wrapped on HTMLBodyElement')
})

jil.browserTest('new property is not added to HTMLElement', function (t) {
  // wrap
  wrapJsonP(baseEE)

  if (Node.prototype.appendChild) {
    t.equal(HTMLElement.prototype.hasOwnProperty('appendChild'), false)
    t.equal(HTMLHeadElement.prototype.hasOwnProperty('appendChild'), false)
    t.equal(HTMLBodyElement.prototype.hasOwnProperty('appendChild'), false)
  }
  t.end()
})

function isWrapped (fn) {
  return fn && typeof fn['nr@original'] === 'function'
}
