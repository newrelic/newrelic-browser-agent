import SpecMatcher from './spec-matcher.mjs'

// Does the browser have a reliable 'unload' event callback?
export const notInternetExplorer = new SpecMatcher()
  .exclude('ie')
