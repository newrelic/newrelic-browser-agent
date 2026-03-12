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

throw new Error('2nd mfe error')
