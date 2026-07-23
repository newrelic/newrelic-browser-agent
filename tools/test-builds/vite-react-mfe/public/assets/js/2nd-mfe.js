window.second = newrelic.register({
  id: 'vite-second-mfe',
  name: '2nd-mfe'
})

fetch('/echo')

const div = document.createElement('div')
div.id = 'second-mfe-div'
div.textContent = 'Hello, world!'
div.dataset.nrMfeId = 'vite-second-mfe'
document.body.appendChild(div)

console.log('2nd mfe log')

const bamServer = window.NREUM.info.beacon
const socket = new WebSocket(`ws://${bamServer}/websocket/pre?param=shouldbedropped`)
socket.addEventListener('open', (event) => {
  socket.send('2nd-mfe!')
})
socket.addEventListener('message', (event) => {
  socket.close() // clean by flag
})

throw new Error('2nd mfe error')
