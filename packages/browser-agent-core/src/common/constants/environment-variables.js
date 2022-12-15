/* eslint-disable */
import * as pkg from '../../../package.json'

// <WEBPACK_*> tag is replaced during webpack build with environment vars supplied at build time
// This will get replaced with just the pkg version once all packages are on semver
const MAJOR = typeof WEBPACK_MAJOR_VERSION !== 'undefined' ? WEBPACK_MAJOR_VERSION : pkg.version.split(".")[0] || ''
const MINOR = typeof WEBPACK_MINOR_VERSION !== 'undefined' ? WEBPACK_MINOR_VERSION : pkg.version.split(".")[1] || ''
// const PATCH = typeof WEBPACK_PATCH_VERSION !== 'undefined' ? WEBPACK_PATCH_VERSION : pkg.version.split(".")[2] || '' // will be filled when migrating to semver

// This will output 1217.PROD in the old format
// This will output 1.0.0 in the new format
export const VERSION = [
    MAJOR,
    MINOR
    // PATCH
].filter(x => x).join(".")
