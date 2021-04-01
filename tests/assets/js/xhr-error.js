var xhrload = new XMLHttpRequest()
xhrload.onload = function goodxhr () {
  window.xhrFired = true
  throw new Error('xhr onload')
}
xhrload.open('GET', '/bogus')
xhrload.send()
