// Safely add an event listener to window in any browser
module.exports = function (sType, callback) {
  if ('addEventListener' in window) {
    return window.addEventListener(sType, callback, false)
  } else if ('attachEvent' in window) {
    return window.attachEvent('on' + sType, callback)
  }
}
