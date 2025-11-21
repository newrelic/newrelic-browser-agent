import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

import * as RobustWebSocket from 'robust-websocket'

const opts = {
  info: NREUM.info,
  init: {
    ...NREUM.init,
    feature_flags: ['websockets']
  }
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
  // Add delay before reload to allow agent to harvest WebSocket event
  setTimeout(() => {
    window.location.reload()
  }, 1000)
})
