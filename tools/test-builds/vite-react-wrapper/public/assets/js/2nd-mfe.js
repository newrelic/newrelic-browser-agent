window.second = newrelic.register({
  id: 1234,
  name: '2nd-mfe'
})

fetch('/echo')

const div = document.createElement('div')
div.textContent = 'Hello, world!'
div.dataset.nrMfeId = 1234
document.body.appendChild(div)

console.log('2nd mfe log')

throw new Error('2nd mfe error')
