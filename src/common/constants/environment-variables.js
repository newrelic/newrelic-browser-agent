// process.env.BUILD_VERSION is replaced during webpack -or- npm build with environment vars supplied at build time
export const VERSION =
  (typeof process.env.BUILD_VERSION !== "undefined" &&
    process.env.BUILD_VERSION) ||
  "";
