// console.log('in mfe.js')

window.test = () => {
  const e = new Error('test error from mfe.js')
  console.log(e.stack)
}

const wait = function wait (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

// Busy-wait synchronously for a minimum duration before this script's top-level code finishes (and its load event
// fires). Without this, the top-level code above is fast enough (sub-millisecond) that, under load, dom.start and
// dom.end can round to the same floored millisecond (now() is Math.floor(performance.now())), making
// MicroFrontEndTiming's timeToExecute (scriptEnd - scriptStart) flake to 0 instead of reflecting real execution time.
const busyWaitMs = (ms) => {
  const end = performance.now() + ms
  while (performance.now() < end) { /* spin */ }
}
busyWaitMs(15)

wait(1000).then(() => {
  const api = newrelic.register({
    id: '1',
    name: 'test'
  })

  // console.log('mfe api', api)

  let iterations1 = 0
  while (iterations1++ < 5000) {
    const div = document.createElement('div')
    div.textContent = 'MFE1 DIV ' + Math.random().toString(36).substring(7)
    div.id = 'mfe1-div-' + iterations1
    document.body.appendChild(div)
  }
  // api.lifecycle('READY')

  const script = document.createElement('script')
  script.src = './js/mfe/mfe/mfe.min.js' // mfe 2
  document.head.appendChild(script)

  while (iterations1-- > 0) {
    const divToRemove = document.getElementById('mfe1-div-' + iterations1)
    if (divToRemove) {
      divToRemove.remove()
    }
  }

  // api.lifecycle('HIDDEN')
  api.deregister()
// console.log(api, 'done')
})
