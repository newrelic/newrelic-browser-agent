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

// Firefox <= 19 has inconsistent timing data.
export const consistentTimingData = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox>19')
  .include('ios')
  .include('android')
  .include('ie@11')

export const notIE = new SpecMatcher()
  .include('safari')
  .include('chrome')
  .include('edge')
  .include('firefox')
  .include('ios')
  .include('android')
