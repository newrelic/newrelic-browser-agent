import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

import * as RobustWebSocket from 'robust-websocket'

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

new BrowserAgent(opts)

window.bamServer = NREUM.info.beacon

var ws = new RobustWebSocket(`ws://${window.bamServer}/websocket`)

ws.addEventListener('open', function (event) {
  ws.send('Hello!')
})

ws.addEventListener('message', function (event) {
  ws.close()
})

ws.addEventListener('close', function () {
  window.location.reload()
})
