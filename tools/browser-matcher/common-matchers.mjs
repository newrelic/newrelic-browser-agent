import SpecMatcher from './spec-matcher.mjs'

// Does the browser have a reliable 'unload' event callback?
export const reliableUnload = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')
  .include('android')

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

export const notIE = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')
  .include('android')

export const notIOS = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('android')
  .include('ie')

export const notSafari = new SpecMatcher()
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')
  .include('android')

export const onlyChrome = new SpecMatcher()
  .include('chrome')
