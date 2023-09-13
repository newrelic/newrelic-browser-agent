// Set the default CDN or remote for fetching the assets; NPM shouldn't change this var.

export const redefinePublicPath = (url) => {
  // There's no URL validation here, so caller should check arg if need be.
  __webpack_public_path__ = url // eslint-disable-line
}
