import SpecMatcher from './spec-matcher.mjs'

export const supportsMultipleTabs = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')

export const supportsFetch = new SpecMatcher()
  .include('safari>=11')
  .include('chrome>=42')
  .include('edge>=14')
  .include('firefox>=40')
  .include('ios>=11')
  .include('android')

// Some browsers support basic fetch API, but not all supporting functions.
// E.g. arrayBuffer on ios@10 generates an error when used with FormData instance.
// MDN shows this function as not supported: https://developer.mozilla.org/en-US/docs/Web/API/Body/arrayBuffer
export const supportsFetchExtended = new SpecMatcher()
  .include('safari>=11.1') // MDN says no support (11.1 currently latest), but 11.1 is accounted for in the tests
  .include('chrome>=42')
  .include('edge>=14')
  .include('firefox>=40')
  .include('ios>=11.3')
  .include('android')

export const notIOS = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('android')

export const notAndroid = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')

export const notFirefox = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('android')

export const notMobile = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')

export const notSafari = new SpecMatcher()
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')
  .include('android')

export const onlyChrome = new SpecMatcher()
  .include('chrome')

export const onlyIOS = new SpecMatcher()
  .include('ios')

export const onlyAndroid = new SpecMatcher()
  .include('android')

export const onlyChromium = new SpecMatcher()
  .include('chrome')
  .include('edge')
  .include('android>=9.0')

export const onlyFirefox = new SpecMatcher()
  .include('firefox')

/**
 * Matcher based on ES2022 support
 * This is a snapshot in time and would need to be updated.
 */
export const es2022Support = new SpecMatcher()
  .include('chrome>=94')
  .include('edge>=94')
  .include('firefox>=93')
  .include('android>=9.0')
  .include('safari>=15.4')
  .include('ios>=15.4')

export const supportsBFCache = new SpecMatcher()
  .include('safari')
  .include('chrome>=96')
  // .include('edge>=89') -- not enabled by default still (current v109); user must set flag
  .include('firefox')
  .include('ios')
  .include('android>=9.0') // -- does not work on android 9.0 emulator (v100 Chrome) for unknown precise reason;

export const supportsFirstPaint = new SpecMatcher()
  .include('chrome>=60')
  .include('edge>=79')
  .include('android>=9.0')

export const supportsFirstContentfulPaint = new SpecMatcher()
  .include('chrome>=60')
  .include('edge>=79')
  .include('android>=9.0')
  .include('firefox>=84')
  .include('safari>15') // this should be >= 14.1 but safari 15 on Sauce hates FCP, and it destroys the other tests on the same thread too...
  .include('ios>=14.5') // -- *cli Mar'23 - FYI there's a bug associated with paint observer for version < 16, see ios-version.js

export const supportsFirstInputDelay = new SpecMatcher()
  .include('chrome>=76')
  .include('edge>=79')
  .include('firefox>=89')
  .include('android>=9.0')

export const supportsLargestContentfulPaint = new SpecMatcher()
  .include('chrome>=77')
  .include('edge>=79')
  .include('android>=9.0')

export const supportsInteractionToNextPaint = new SpecMatcher()
  .include('chrome>=96')
  .include('edge>=96')
  .include('android>=9.0')

export const supportsLongTaskTiming = new SpecMatcher()
  .include('chrome>=58')
  .include('edge>=79')

export const supportsCumulativeLayoutShift = supportsLargestContentfulPaint
