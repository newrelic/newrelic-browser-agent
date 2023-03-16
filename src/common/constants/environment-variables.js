// Webpack and NPM builds define `process.env.BUILD_VERSION` at build time based on variables supplied at build time.
// VERSION as defined here ends up decorating: agent runtime configuration, harvest, and supportability metrics.
export const VERSION = typeof process.env.BUILD_VERSION !== 'undefined' && process.env.BUILD_VERSION || ''
