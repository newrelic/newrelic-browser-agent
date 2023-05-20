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
