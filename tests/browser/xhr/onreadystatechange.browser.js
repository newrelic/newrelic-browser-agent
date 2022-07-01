/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
import { setup } from '../utils/setup'

const { agentIdentifier } = setup();

jil.browserTest('xhr with onreadystatechange assigned after send', async function (t) {
  const ffVersion = await import('../../../packages/browser-agent-core/common/browser-version/firefox-version');
  const { Instrument: AjaxInstrum } = await import('../../../packages/browser-agent-core/features/ajax/instrument/index');
  const ajaxTestInstr = new AjaxInstrum(agentIdentifier);

  setTimeout(() => {
    let xhr = new XMLHttpRequest()

    xhr.open('GET', '/slowscript')
    xhr.send()

    let readyStatesSeen = []

    xhr.onreadystatechange = function (e) {
      if (ffVersion > 10) {
        t.ok(xhr.onreadystatechange['nr@original'], 'onreadystatechange should be wrapped for readyState ' + xhr.readyState)
      }

      if (xhr.readyState === 1) {
        t.fail('should not see onreadystatechange fire for readyState 1')
      }

      readyStatesSeen.push(xhr.readyState)

      if (xhr.readyState === 4) {
        t.ok(readyStatesSeen.indexOf(2) !== -1, 'saw readyState 2')
        t.ok(readyStatesSeen.indexOf(3) !== -1, 'saw readyState 3')
        t.ok(readyStatesSeen.indexOf(4) !== -1, 'saw readyState 4')
        t.end()
      }
    }
  })
})

jil.browserTest('multiple XHRs with onreadystatechange assigned after send', async function (t) {
  const ffVersion = await import('../../../packages/browser-agent-core/common/browser-version/firefox-version');
  const { Instrument: AjaxInstrum } = await import('../../../packages/browser-agent-core/features/ajax/instrument/index');
  const ajaxTestInstr = new AjaxInstrum(agentIdentifier);

  setTimeout(() => {
    let xhr1 = new XMLHttpRequest()
    xhr1.open('GET', '/slowscript')
    xhr1.send()
    xhr1.readyStatesSeen = []
    xhr1.onreadystatechange = handleReadyStateChange
    xhr1.onload = countDown

    let xhr2 = new XMLHttpRequest()
    xhr2.open('GET', '/slowscript')
    xhr2.send()
    xhr2.readyStatesSeen = []
    xhr2.onreadystatechange = handleReadyStateChange
    xhr2.onload = countDown

    let remaining = 2

    function countDown () {
      if (--remaining) return

      t.ok(xhr1.readyStatesSeen.indexOf(2) !== -1, 'saw readyState 2 for xhr1')
      t.ok(xhr1.readyStatesSeen.indexOf(3) !== -1, 'saw readyState 3 for xhr1')
      t.ok(xhr1.readyStatesSeen.indexOf(4) !== -1, 'saw readyState 4 for xhr1')

      t.ok(xhr2.readyStatesSeen.indexOf(2) !== -1, 'saw readyState 2 for xhr2')
      t.ok(xhr2.readyStatesSeen.indexOf(3) !== -1, 'saw readyState 3 for xhr2')
      t.ok(xhr2.readyStatesSeen.indexOf(4) !== -1, 'saw readyState 4 for xhr2')

      t.end()
    }

    function handleReadyStateChange (e) {
      if (ffVersion > 10) {
        t.ok(this.onreadystatechange['nr@original'], 'onreadystatechange should be wrapped for readyState ' + this.readyState)
      }

      if (this.readyState === 1) {
        t.fail('should not see onreadystatechange fire for readyState 1')
      }

      this.readyStatesSeen.push(this.readyState)
    }
  })
})
