var submitData = module.exports = {}

submitData.jsonp = function jsonp (url, jsonp) {
  var element = document.createElement('script')
  element.type = 'text/javascript'
  element.src = url + '&jsonp=' + jsonp
  var firstScript = document.getElementsByTagName('script')[0]
  firstScript.parentNode.insertBefore(element, firstScript)
  return element
}

submitData.xhr = function xhr (url, body, sync) {
  var request = new XMLHttpRequest()

  request.open('POST', url, !sync)
  try {
    // Set cookie
    if ('withCredentials' in request) request.withCredentials = true
  } catch (e) {}

  request.setRequestHeader('content-type', 'text/plain')
  request.send(body)
  return request
}

submitData.xhrSync = function xhrSync (url, body) {
  return submitData.xhr(url, body, true)
}

submitData.img = function img (url) {
  var element = new Image()
  element.src = url
  return element
}

submitData.beacon = function (url, body) {
  return navigator.sendBeacon(url, body)
}
