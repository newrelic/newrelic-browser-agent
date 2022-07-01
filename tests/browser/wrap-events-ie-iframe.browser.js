/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('Does not throw an error when iframe with newrelic disappears', function (t) {
  var iframe = document.createElement('iframe')
  var followerDoc
  var attemptCount = 0
  var errorCount = 0

  iframe.onload = function () {
    var content = iframe.contentDocument
    setDocument(content)
  }

  function handler () {
    setDocument()
  }

  function setDocument (node) {
    try {
      attemptCount++
      followerDoc === {} // do a comparison - this is what breaks!
    } catch (e) {
      errorCount++
    } finally {
      if (attemptCount === 4) {
        if (errorCount > 0) {
          t.fail('No errors should be reported')
        } else {
          t.pass()
        }
        t.end()
      }
    }
    followerDoc = node || window.document
    followerDoc.defaultView.addEventListener('unload', handler)
  }

  // inject
  iframe.src = './iframe-bottom.html'
  document.body.appendChild(iframe)

  // Interact
  function reload () {
    var el = iframe.contentDocument.getElementById('reload')
    triggerClick(el)
  }

  setTimeout(reload, 1000)
  setTimeout(reload, 2000)
})

// This is complciated because we are triggering an event in an iFrame.
function triggerClick (el) {
  try {
    // works in Chrome, breaks in IE
    const evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    })
    el.dispatchEvent(evt)
  } catch (e) {
    // Works in IE, breaks in Chrome
    const evt = document.createEvent('Events')
    evt.initEvent('click', true, false)
    el.dispatchEvent(evt)
  }
}
