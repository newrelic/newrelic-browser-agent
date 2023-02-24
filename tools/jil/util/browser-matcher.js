/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

let features = {}

const TYPE_INCLUDE = 'include'
const TYPE_EXCLUDE = 'exclude'
const TYPE_INVERT = 'invert'

module.exports = BrowserMatcher

// Include always has precedence over exclude.
// Inverse may only be called once at the end of a chain.
// To include *only* specific browsers, you can either exclude them and then
// call .inverse(), or call .exclude('*').include(...).

function CompositMatcher (left, right, operation) {
  this.operation = operation
  this.left = left
  this.right = right
}

CompositMatcher.prototype.match = function (spec) {
  return this.operation(this.left.match(spec), this.right.match(spec))
}

CompositMatcher.prototype.and = getAndComposite
CompositMatcher.prototype.or = getOrComposite

function BrowserMatcher (rules = [], finalized = false) {
  this.rules = rules
  this.finalized = finalized
}

BrowserMatcher.prototype.exclude = function (browser, range = '*') {
  if (this.finalized) throw new Error('Cannot modify finalized matcher')
  let rule = new MatcherRule(TYPE_EXCLUDE, `${browser}@${range}`)
  return new BrowserMatcher(this.rules.concat(rule))
}

BrowserMatcher.prototype.include = function (browser, range = '*') {
  if (this.finalized) throw new Error('Cannot modify finalized matcher')
  let rule = new MatcherRule(TYPE_INCLUDE, `${browser}@${range}`)
  return new BrowserMatcher(this.rules.concat(rule))
}

BrowserMatcher.prototype.inverse = function () {
  if (this.finalized) throw new Error('Cannot modify finalized matcher')
  let rule = new MatcherRule(TYPE_INVERT)
  return new BrowserMatcher(this.rules.concat(rule), true)
}

BrowserMatcher.prototype.intersect = function (other) {
  if (this.finalized || other.finalized) throw new Error('Cannot intersect finalized matchers')
  return new BrowserMatcher(this.rules.concat(other.rules))
}

BrowserMatcher.prototype.match = function (spec) {
  let excludes = this.rules.filter((r) => r.type === TYPE_EXCLUDE)
  let includes = this.rules.filter((r) => r.type === TYPE_INCLUDE)
  let inverse = !!this.rules.find((r) => r.type === TYPE_INVERT)

  let excludeSpec = excludes.map((r) => r.spec).join(', ')
  let includeSpec = includes.map((r) => r.spec).join(', ')
  let excluded = excludeSpec && spec.match(excludeSpec)
  let included = includeSpec && spec.match(includeSpec)
  let matched = !excluded || included

  return (!inverse && matched) || (inverse && !matched)
}

BrowserMatcher.prototype.and = getAndComposite
BrowserMatcher.prototype.or = getOrComposite

function getAndComposite (matcher) {
  return new CompositMatcher(this, matcher, function (left, right) {
    return left && right
  })
}

function getOrComposite (matcher) {
  return new CompositMatcher(this, matcher, function (left, right) {
    return left || right
  })
}

BrowserMatcher.withFeature = function (feature) {
  let featureMatcher = features[feature]
  if (!featureMatcher) throw new Error(`unrecognized browser feature '${feature}'`)
  return featureMatcher
}

function MatcherRule (type, spec) {
  this.type = type
  this.spec = spec
}

// Does the browser have a reliable 'unload' event callback?
features.reliableUnloadEvent = new BrowserMatcher()
  // MobileSafari cannot be webdriven. Thus, every automated test system uses
  // UIWebViews in a special app. Unfortunately, UIWebView does not emit the
  // 'unload' event when a new URL is requested. This inhibits error reporting in
  // automated tests even though it works in the real browser. Since mobile safari
  // is likely identical in behavior to OS X safari, we can assume that any issues
  // will be caught there and skip testing iOS.
  .exclude('ios')

/** DEPRECATED */
features.addEventListener = new BrowserMatcher()
  .exclude('ie', '<9')

/** DEPRECATED */
features.wrappableAddEventListener = features.addEventListener
  // Our addEventListener wrapping doesn't work with older versions of Firefox,
  // because in those versions, each descendent of Element gets its own unique
  // copy of addEventListener, rather than inheriting via the prototype chain.
  .exclude('firefox', '<25')

features.hasInnerText = features.addEventListener
  // https://developer.mozilla.org/en-US/docs/Web/API/Node/innerText
  .exclude('firefox', '<45')

// Does the browser pass an actual Error object to window.onerror?
features.uncaughtErrorObject = new BrowserMatcher()
  .exclude('chrome', '<31')
  .exclude('firefox', '<31')
  .exclude('android', '<4.4')
  .exclude('ie', '<11')
  .exclude('safari', '<10')
  .exclude('edge')

features.setImmediate = new BrowserMatcher()
  .exclude('*', '*')
  .include('ie@>=10')

// requires window.perfomance.getEntriesByType
features.stn = new BrowserMatcher()
  .exclude('chrome', '<6')
  .exclude('android', '<4.4')
  .exclude('firefox', '<35')
  .exclude('ie', '<10')
  .exclude('safari', '<=10.1')
  .exclude('ios', '<=10.3') // because of https://developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByType

features.navTiming = new BrowserMatcher()
  .exclude('chrome', '<6')
  .exclude('android', '<4')
  .exclude('firefox', '<7')
  .exclude('ie', '<9')
  .exclude('safari', '<8')
  .exclude('ios', '<9')

/** DEPRECATED */
features.cors = new BrowserMatcher()
  .exclude('ie@<10')

features.promise = new BrowserMatcher()
  .exclude('ie', '<=11')
  .exclude('firefox', '<29')
  .exclude('chrome', '<33')
  .exclude('safari', '<7.1')
  .exclude('ios', '<8')
  .exclude('android', '<4.4.4')

features.mutation = new BrowserMatcher()
  .exclude('ie', '<=11')
  .exclude('firefox', '<14')
  .exclude('chrome', '<18')
  .exclude('safari', '<6.1')
  .exclude('ios', '<7.1')
  .exclude('android', '<4.4')

features.fetch = new BrowserMatcher()
  .exclude('ie', '<=11')
  .exclude('edge', '<14')
  .exclude('firefox', '<=60')
  .exclude('chrome', '<42')
  .exclude('safari', '<10.1') // MDN says 10, but per tests 10.1 (also noted here https://en.wikipedia.org/wiki/Safari_version_history)
  .exclude('ios', '<=10.2') // https://github.com/github/fetch/issues/401
  .exclude('android', '<=4.4')

// some browsers support basic fetch API, but not all supporting functions,
// e.g. arrayBuffer on ios@10 generates an error when used with FormData instance
// MDN shows this function as not supported
// https://developer.mozilla.org/en-US/docs/Web/API/Body/arrayBuffer
features.fetchExt = features.fetch.and(new BrowserMatcher()
  .exclude('ios', '<11.3')
  .exclude('safari', '<11.1') // MDN says no support (11.1 currently latest), but 11.1 is accounted for in the tests
)

features.requestAnimationFrame = new BrowserMatcher()
  .exclude('ie', '<10')
  .exclude('firefox', '<11')
  .exclude('chrome', '<22')
  .exclude('safari', '<6.1')
  .exclude('ios', '<7.1')
  .exclude('android', '<4.4')

features.sendBeacon = new BrowserMatcher()
  .exclude('*')
  .include('edge', '>=14')
  .include('chrome', '>=39')
  .include('firefox', '>=31')
  .include('android', '>=6')
  .include('safari', '>=11.1')
  .include('ios', '>=11.3')

// Safari on macOS 11.1 - 12.2 have a bug in the sendBeacon API during pgehide event listener -- fixed in ios 12.3
// The agent falls back to using image
// https://bugs.webkit.org/show_bug.cgi?id=188329
features.brokenSendBeacon = new BrowserMatcher()
  .exclude('*')
  .include('safari', '<12.3')
  .include('ios', '<13.0')

features.workingSendBeacon = features.sendBeacon.and(features.brokenSendBeacon.inverse())

features.blob = new BrowserMatcher()
  .exclude('ie', '<10')
  .exclude('firefox', '<13')
  .exclude('chrome', '<20')
  .exclude('safari', '<6')
  .exclude('ios', '<7.1')
  .exclude('android')

/** DEPRECATED */
features.tls = new BrowserMatcher()
  .exclude('ie', '<7')

features.addEventListenerOptions = new BrowserMatcher()
  .exclude('firefox', '<49')
  .exclude('chrome', '<49')
  .exclude('android')
  .exclude('safari', '<10')
  .exclude('edge')
  .exclude('ios')
  .exclude('ie')

features.firstPaint = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=60')
  .include('android')
  .include('edge')

features.firstContentfulPaint = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=60')
  .include('firefox', '>=84')
  .include('ios', '>=14.5')
  .include('android')
  .include('edge')

features.largestContentfulPaint = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=77')

features.cumulativeLayoutShift = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=84')

features.interactionToNextPaint = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=96')
  .include('edge', '>=96')

features.longTaskTiming = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=58')
  .include('edge', '>=79')

// btoa() is used to base-64-encode Distributed Tracing header data.
// https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Browser_compatibility
features.btoa = new BrowserMatcher()
  .exclude('ie', '<=9')

// https://github.com/SeleniumHQ/selenium/issues/7649
// once latest Safari does not have this bug, we can remove this
features.notSafariWithSeleniumBug = new BrowserMatcher()
  .exclude('safari', '>=13')

features.notInternetExplorer = new BrowserMatcher()
  .exclude('ie')

features.originOnlyReferer = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=89')
  .include('firefox', '>=87')
  .include('ios', '>11.2')
  .include('android')
  .include('edge')

features.passiveSupported = features.addEventListener
  .exclude('*')
  .include('edge', '>15')
  .include('firefox', '>48')
  .include('chrome', '>50')
  .include('safari', '>9.3')
  .include('android')
  .include('ios', '>=10')

features.frameworks = new BrowserMatcher()
  .exclude('*')
  .include('chrome', 'latest')
  .include('firefox', 'latest')
  .include('ie', 'latest')
  .include('safari', 'latest')
  .include('android', 'latest')
  .include('edge', 'latest')

features.obfuscate = new BrowserMatcher()
  .exclude('*')
  .include('chrome', 'latest')
  .include('firefox', 'latest')
  .include('safari', 'latest')
  .include('edge', 'latest')

features.es6 = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=60')
  .include('safari', '>=11.3')
  .include('firefox', '>=55')
  .include('edge', '>79')
  .include('ios', '>=11.3')

features.customElements = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>=67')
  .include('firefox', '>=63')
  .include('edge', '>=79')

features.latestSmoke = new BrowserMatcher()
  .exclude('*')
  .include('chrome', 'latest')
  .include('firefox', 'latest')

// TODO -- Enable this and add appropriate browsers when NPM is fixed
features.mfe = new BrowserMatcher()
  .exclude('*')

features.polyfillsNeeded = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '<=63')
  .include('firefox', '<=67')
  .include('edge', '<=79')
  .include('safari', '<=11.3')

features.workerStackSizeGeneratesError = new BrowserMatcher()
  .exclude('firefox')

features.unhandledPromiseRejection = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>49')
  .include('edge', '>79')
  .include('safari', '>12')
  .include('firefox', '>69')

features.bfcache = new BrowserMatcher()
  .exclude('*')
  .include('chrome', '>100') // included in v96+, but either not enabled by default until later or Sauce doesn't enable the flag
  //.include('edge', '>=89') -- not enabled by default still (current v109); user must set flag
  .include('firefox')
  .include('safari', '>15') // -- test does not work on safari 15 for unknown precise reason;
  .include('ios')
  //.include('android', '>=9.0') -- does not work on android 9.0 emulator (v100 Chrome) for unknown precise reason;

/* vvv--- Workers API support ---vvv
  */
features.workers = new BrowserMatcher([ // NOTE: module type workers have different (higher) compatibility versions, excluding IE11
  new MatcherRule(TYPE_EXCLUDE, '*@*'),
  new MatcherRule(TYPE_INCLUDE, 'chrome@>=4'),
  new MatcherRule(TYPE_INCLUDE, 'edge@>=12'),
  new MatcherRule(TYPE_INCLUDE, 'safari@>=4'),
  new MatcherRule(TYPE_INCLUDE, 'firefox@>=3.5'),
  new MatcherRule(TYPE_INCLUDE, 'android@>=4.4'),
  new MatcherRule(TYPE_INCLUDE, 'ios@>=5')
])
features.supportESMWorkers = new BrowserMatcher([ // not avail in Firefox browsers, or Safari below 15
  new MatcherRule(TYPE_EXCLUDE, '*@*'),
  new MatcherRule(TYPE_INCLUDE, 'chrome@>=80'),
  new MatcherRule(TYPE_INCLUDE, 'edge@>=80'),
  new MatcherRule(TYPE_INCLUDE, 'safari@>=15'),
  new MatcherRule(TYPE_INCLUDE, 'android@>=9.0'),
  new MatcherRule(TYPE_INCLUDE, 'ios@>=15.0')
])
features.workersFull = features.workers.and(features.supportESMWorkers) // use this to filter versions that support both default & module
features.nestedWorkers = new BrowserMatcher([
  new MatcherRule(TYPE_EXCLUDE, '*@*'),
  new MatcherRule(TYPE_INCLUDE, 'chrome@>=69'),
  new MatcherRule(TYPE_INCLUDE, 'edge@>=69'), // specific support line for edge unclear, using chrome's since based off chromium
  new MatcherRule(TYPE_INCLUDE, 'firefox@>=44'), // specific support line for ff unclear, using serviceWorker line
  new MatcherRule(TYPE_INCLUDE, 'android@>=9.0') // not sure if android supports it at all? -- testing currently disabled
  // safari & ios does not yet support nested (dedicated) workers, current v16 *cli 10/22
])

features.sharedWorkers = new BrowserMatcher([ // not avail android, or Safari below 16
  new MatcherRule(TYPE_EXCLUDE, '*@*'),
  new MatcherRule(TYPE_INCLUDE, 'chrome@>=4'),
  new MatcherRule(TYPE_INCLUDE, 'edge@>=79'),
  new MatcherRule(TYPE_INCLUDE, 'safari@>=16.0'),
  new MatcherRule(TYPE_INCLUDE, 'firefox@>=29'),
  new MatcherRule(TYPE_INCLUDE, 'ios@>=16.0')
])
features.sharedWorkersFull = features.sharedWorkers.and(features.supportESMWorkers)

features.serviceWorkers = new BrowserMatcher([
  new MatcherRule(TYPE_EXCLUDE, '*@*'),
  new MatcherRule(TYPE_INCLUDE, 'chrome@>60'), // v60 has unexpected behavior of working on unsecured HTTP tests
  new MatcherRule(TYPE_INCLUDE, 'edge@>=17'),
  new MatcherRule(TYPE_INCLUDE, 'safari@>=11.1'),
  new MatcherRule(TYPE_INCLUDE, 'firefox@>=44'),
  new MatcherRule(TYPE_INCLUDE, 'android@>=9.0'),
  new MatcherRule(TYPE_INCLUDE, 'ios@>=11.3')
])
