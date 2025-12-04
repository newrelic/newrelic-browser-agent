import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

import ReconnectingWebSocket from 'reconnecting-websocket'

const opts = {
  info: NREUM.info,
  init: {
    ...NREUM.init,
    feature_flags: ['websockets']
  }
}

new BrowserAgent(opts)

window.bamServer = NREUM.info.beacon

const rws = new ReconnectingWebSocket(`ws://${window.bamServer}/websocket`)

rws.addEventListener('open', () => {
  rws.send('hello!')
  rws.addEventListener('message', (message) => {
    rws.close()
  })

  rws.addEventListener('close', function () {
    // Add delay before reload to allow agent to harvest WebSocket event
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  })
})
