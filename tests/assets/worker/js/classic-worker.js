onmessage = function (e) {
  if (e.data.type === 'command') {
    eval(e.data.fn)()
  }
  if (e.data.type === 'startAgent') {
    self.NREUM = e.data.payload
    importScripts('/web-worker-agent')
    self.postMessage({type: 'ready'})
  }
}
