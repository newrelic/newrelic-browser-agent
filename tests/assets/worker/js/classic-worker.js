onmessage = function (e) {
  if (e.data.type === 'command') {
    eval(e.data.fn)()
  }
  if (e.data.type === 'startAgent') {
    self.NREUM = e.data.payload
    importScripts('/web-worker-agent') // JIL's endpoint to fetch the single bundle web worker pkg
    self.postMessage({type: 'ready'})
  }
}

