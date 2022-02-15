function setNREUM() {
  if (!window.NREUM) {
    window.NREUM = {}
  }

  if (!window.NREUM.o) {
    var win = window
    // var doc = win.document
    var XHR = win.XMLHttpRequest

    NREUM.o = {
      ST: setTimeout,
      SI: win.setImmediate,
      CT: clearTimeout,
      XHR: XHR,
      REQ: win.Request,
      EV: win.Event,
      PR: win.Promise,
      MO: win.MutationObserver,
      FETCH: win.fetch
    }
  }
}

export default setNREUM()
