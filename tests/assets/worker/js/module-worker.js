onmessage = function (e) {
  if (e.data.type === 'command') {
    eval(e.data.fn)()
  }
  if (e.data.type === 'startAgent') {
    self.NREUM = e.data.payload
    import('/web-worker-agent').then(() => {
      self.postMessage({type: 'ready'})
    })
  }
}
