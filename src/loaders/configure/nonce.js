/* global __webpack_require__ */

__webpack_require__.nc = (() => {
  try {
    if (document.currentScript && document.currentScript.nonce) {
      return document.currentScript.nonce
    }

    // Fallback for browsers that do not support document.currentScript (IE11)
    const scriptTags = document.querySelectorAll('script')
    for (let i = 0; i < scriptTags.length; i++) {
      const scriptTag = scriptTags[i]
      if (scriptTag.nonce) {
        return scriptTag.nonce
      }
    }
  } catch (ex) {
    // Swallow error and proceed like nonce is not defined
  }

  return ''
})()
