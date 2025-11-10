console.log('in mfe2.js')

const api2 = newrelic.register({
  id: 2,
  name: 'test'
})

console.log('mfe2 api', api2)

let iterations2 = 0
while (iterations2++ < 5000) {
  const div = document.createElement('div')
  div.textContent = 'MFE2 DIV ' + Math.random().toString(36).substring(7)
  div.id = 'mfe2-div-' + iterations2
  document.body.appendChild(div)
}
api2.markLoaded()

while (iterations2-- > 0) {
  const divToRemove = document.getElementById('mfe2-div-' + iterations2)
  if (divToRemove) {
    divToRemove.remove()
  }
}

api2.markUnloaded()
