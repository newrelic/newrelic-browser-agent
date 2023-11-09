/* global __webpack_require__ */

__webpack_require__.nc = (() => {
  try {
    if (document.currentScript && document.currentScript.nonce) {
      return document.currentScript.nonce
    }
  } catch (ex) {
    // Swallow error and proceed like nonce is not defined
  }

  return ''
})()
