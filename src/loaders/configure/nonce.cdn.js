/* global __webpack_require__ */

__webpack_require__.nc = (() => {
  try {
    return document?.currentScript?.nonce
  } catch (ex) {
    // Swallow error and proceed like nonce is not defined
    // This will happen when the agent is loaded in a worker scope
  }

  return ''
})()
