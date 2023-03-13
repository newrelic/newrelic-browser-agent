// process.env.BUILD_VERSION is replaced during webpack -or- npm build with environment vars supplied at build time
export const VERSION = typeof process.env.BUILD_VERSION !== 'undefined' && process.env.BUILD_VERSION || ''

// process.env.BUILD_ENV is replaced during webpack -or- npm build with environment vars supplied at build time
// LOCAL, PROD, DEV, etc
export const BUILD_ENV = typeof process.env.BUILD_ENV !== 'undefined' && process.env.BUILD_ENV || ''
