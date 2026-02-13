// ES module for mfe3
const api3 = newrelic.register({
  id: 3,
  name: 'test 3'
})

let iterations3 = 0
while (iterations3++ < 5000) {
  const div = document.createElement('div')
  div.textContent = 'MFE3 DIV ' + Math.random().toString(36).substring(7)
  div.id = 'mfe3-div-' + iterations3
  document.body.appendChild(div)
}

while (iterations3-- > 0) {
  const divToRemove = document.getElementById('mfe3-div-' + iterations3)
  if (divToRemove) {
    divToRemove.remove()
  }
}

// Store on window so test can access if needed
window.api3 = api3

export { api3 }
