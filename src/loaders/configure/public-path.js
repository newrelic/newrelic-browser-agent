// Set the default CDN or remote for fetching the assets; NPM shouldn't change this var.
if (typeof WEBP_CONST_PUBLIC_PATH !== 'undefined') {
  __webpack_public_path__ = WEBP_CONST_PUBLIC_PATH // eslint-disable-line
}

export const redefinePublicPath = (url) => {
  // There's no URL validation here, so caller should check arg if need be.
  __webpack_public_path__ = url // eslint-disable-line
}
