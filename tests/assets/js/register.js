const myApp = newrelic.register({
  licenseKey: 'licenseKey',
  applicationID: 'applicationID'
})

document.addEventListener('click', function () {
  simulatedLongTask('MFE')
})

function simulatedLongTask (name, useSetTimeout) {
  performance.mark('start_' + name)
  updateDOM(name + ' task started')
  // so as to not let the slow task block rendering for demo purposes

  const executor = useSetTimeout
    ? (fn) => setTimeout(fn, 0)
    : function slowHandler (fn) {
      fn()
    }

  executor(reallySlowFn)

  function reallySlowFn () {
    let i = 0
    const loops = getRandomInt(100000000, 1000000000)
    while (i < loops) {
      i++
    }
    performance.mark('end_' + name)
    const measure = performance.measure('longTask_' + name, 'start_' + name, 'end_' + name)
    updateDOM('Long task (' + name + ') duration: ' + measure.duration.toFixed(4), 'red')
  }
}

function updateDOM (text, color) {
  const elem = document.createElement('div')
  elem.innerHTML = text
  elem.style.color = color || 'black'
  document.querySelector('#content').appendChild(elem)
}
function getRandomInt (min, max) {
  return Math.ceil(Math.floor(Math.random() * (max - min + 1)) + min)
}
