onmessage = function (e) {
  if (e.data.type === 'startAgent') {
    self.NREUM = e.data.payload
    importScripts('/web-worker-agent') // JIL's endpoint to fetch the single bundle web worker pkg
    self.postMessage({ type: 'ready' })
  } else if (e.data.type === 'command') {
    // Let errors go unhandled so bad commands crashes the tests for troubleshooting.
    let retVal = eval(e.data.fn) // run the literal string cmd
    if (typeof retVal == 'function') retVal() // and if it's a function definition, invoke it
  }
}
