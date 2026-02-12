// console.log('MFE 4! -- THIS FILE IS PRELOADED IN TESTS WITH THE MOCK-API plugin!')
//
const api4 = newrelic.register({
  id: 4,
  name: 'test 4'
})

let iterations4 = 0
while (iterations4++ < 5000) {
  const div = document.createElement('div')
  div.textContent = 'MFE4 DIV ' + Math.random().toString(36).substring(7)
  div.id = 'mfe4-div-' + iterations4
  document.body.appendChild(div)
}

while (iterations4-- > 0) {
  const divToRemove = document.getElementById('mfe4-div-' + iterations4)
  if (divToRemove) {
    divToRemove.remove()
  }
}

// Store on window so test can access if needed
window.api4 = api4
