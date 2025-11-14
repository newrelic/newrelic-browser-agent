console.log('in mfe.js')

const api = newrelic.register({
  id: 1,
  name: 'test'
})

console.log('mfe api', api)

let iterations1 = 0
while (iterations1++ < 5000) {
  const div = document.createElement('div')
  div.textContent = 'MFE1 DIV ' + Math.random().toString(36).substring(7)
  div.id = 'mfe1-div-' + iterations1
  document.body.appendChild(div)
}
// api.lifecycle('READY')

const script = document.createElement('script')
script.src = './js/mfe2.min.js'
document.head.appendChild(script)

while (iterations1-- > 0) {
  const divToRemove = document.getElementById('mfe1-div-' + iterations1)
  if (divToRemove) {
    divToRemove.remove()
  }
}

// api.lifecycle('HIDDEN')
api.deregister()
console.log(api)
