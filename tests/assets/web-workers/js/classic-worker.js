console.log('importing')

onmessage = function (e) {
  console.log('message from main thread', e)
  if (e.data.type === 'startAgent') {
    self.NREUM = e.data.payload
    const featureConfig = {
      "ajax": { enabled: true },
      "jserrors": { enabled: true },
      "metrics": { enabled: true },
      "page_action": { enabled: true },
      "page_view_event": { enabled: false },
      "page_view_timing": { enabled: false },
      "session_trace": { enabled: false },
      "spa": { enabled: false },
    }

    Object.assign(self.NREUM.init, featureConfig)

    console.log('self.NREUM', self.NREUM)
    // TODO: CDN currently breaks on importing aggregator
    importScripts('/web-worker-agent')
    console.log(self)

    setTimeout(() => {
      console.log("noticeError")
      self.NREUM.noticeError("web-worker-test")
    }, 1000)
  }
}
