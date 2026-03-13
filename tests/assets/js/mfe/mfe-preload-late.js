/* MFE 5 - THIS FILE IS LOADED LATE BY mfe-preload.js async loader */

// Capture stack when register is called
const stackAtRegister = new Error().stack

const api5 = newrelic.register({
  id: 5,
  name: 'test 5'
})

let iterations5 = 0
while (iterations5++ < 5000) {
  const div = document.createElement('div')
  div.textContent = 'MFE5 DIV ' + Math.random().toString(36).substring(7)
  div.id = 'mfe5-div-' + iterations5
  document.body.appendChild(div)
}

while (iterations5-- > 0) {
  const divToRemove = document.getElementById('mfe5-div-' + iterations5)
  if (divToRemove) {
    divToRemove.remove()
  }
}

// Store on window so test can access and inspect stack
window.api5 = api5
window.api5StackTrace = stackAtRegister

// Log the stack to verify mfe-preload.js appears at the root
console.log('Stack trace from mfe-preload-late.js register():', stackAtRegister)
