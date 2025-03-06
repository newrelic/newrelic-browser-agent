import SpecMatcher from './spec-matcher.mjs'

/**
 * The safari webdriver by design treats each window and tab as a private browsing context. This
 * means that localStorage is not shared between tabs and windows. iOS and Android do not support
 * the creating of multiple tabs.
 * @see https://developer.apple.com/documentation/webkit/about_webdriver_for_safari#2957219
 * @type {SpecMatcher}
 */
export const supportsMultiTabSessions = new SpecMatcher()
  .include('chrome')
  .include('edge')
  .include('firefox')

/**
 * auto-inlining broken stylesheets does not work in safari browsers < 16.3
 * current mitigation strategy is defined as informing customers to add `crossOrigin: anonymous` tags to cross-domain stylesheets
 */
export const supportsInliningCrossOriginStylesheets = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios>=16.3')
  .include('safari>=16.3')

export const notIOS = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('safari')

export const notAndroid = new SpecMatcher()
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')
  .include('safari')

export const notSafari = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')

export const onlyChrome = new SpecMatcher()
  .include('chrome')

export const onlyIOS = new SpecMatcher()
  .include('ios')

export const onlyAndroid = new SpecMatcher()
  .include('android')

export const onlyChromium = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')

export const onlyFirefox = new SpecMatcher()
  .include('firefox')

export const supportsFirstPaint = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')

export const supportsLargestContentfulPaint = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')
  .include('firefox')

export const supportsInteractionToNextPaint = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')

export const supportsCumulativeLayoutShift = new SpecMatcher()
  .include('android')
  .include('chrome')
  .include('edge')
