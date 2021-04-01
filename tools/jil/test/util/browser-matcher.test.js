var tape = require('tape')
var path = require('path')

var require = module.require('es6-require')(module, null, path.resolve(__dirname, '../../util'))
var BrowserMatcher = require('../../util/browser-matcher.es6')
var BrowserSpec = require('../../util/browser-list.es6').BrowserSpec
var setBrowserList = require('../../util/browser-list.es6').setBrowserList

tape('by default includes everything', function (t) {
  setBrowserList({
    'safari': [
      { 'browserName': 'safari', 'version': '11' },
      { 'browserName': 'safari', 'version': '10' }
    ]
  })

  let matcher = new BrowserMatcher()
    .exclude('safari', '10')

  t.ok(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '11'
  })), 'should match')

  t.notOk(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '10'
  })), 'should not match')

  t.end()
})

tape('exclude all', function (t) {
  setBrowserList({
    'safari': [
      { 'browserName': 'safari', 'version': '11' },
      { 'browserName': 'safari', 'version': '10' }
    ]
  })

  let matcher = new BrowserMatcher()
    .exclude('*')

  t.notOk(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '11'
  })), 'should match')

  t.notOk(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '10'
  })), 'should not match')

  t.end()
})

tape('include takes precedence', function (t) {
  setBrowserList({
    'safari': [
      { 'browserName': 'safari', 'version': '11' },
      { 'browserName': 'safari', 'version': '10' }
    ]
  })

  let matcher = new BrowserMatcher()
    .exclude('safari', '10')
    .include('safari', '10')

  t.ok(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '10'
  })), 'should match')

  matcher = new BrowserMatcher()
    .include('safari', '10')
    .exclude('safari', '10')

  t.ok(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '10'
  })), 'should match')

  t.end()
})

tape('inverse', function (t) {
  setBrowserList({
    'safari': [
      { 'browserName': 'safari', 'version': '11' },
      { 'browserName': 'safari', 'version': '10' }
    ]
  })

  let matcher = new BrowserMatcher()
    .exclude('safari', '10')
    .inverse()

  t.notOk(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '11'
  })), 'should not match')

  t.ok(matcher.match(new BrowserSpec({
    browserName: 'safari',
    version: '10'
  })), 'should match')

  t.end()
})

tape('and operator', function (t) {
  setBrowserList({
    'chrome': [
      { 'browserName': 'chrome', 'version': '1' },
      { 'browserName': 'chrome', 'version': '2' }
    ]
  })

  let matcher1 = new BrowserMatcher()
    .exclude('*')
    .include('chrome', '*')

  let matcher2 = new BrowserMatcher()
    .exclude('*')
    .include('chrome', '1')

  let combined = matcher1.and(matcher2)

  t.ok(combined.match(new BrowserSpec({
    browserName: 'chrome',
    version: '1'
  })), 'should match')

  t.notOk(combined.match(new BrowserSpec({
    browserName: 'chrome',
    version: '2'
  })), 'should not match')

  t.end()
})

tape('or operator', function (t) {
  setBrowserList({
    'chrome': [
      { 'browserName': 'chrome', 'version': '1' },
      { 'browserName': 'chrome', 'version': '2' }
    ]
  })

  let matcher1 = new BrowserMatcher()
    .exclude('*')
    .include('chrome', '1')

  let matcher2 = new BrowserMatcher()
    .exclude('*')
    .include('chrome', '2')

  let combined = matcher1.or(matcher2)

  t.ok(combined.match(new BrowserSpec({
    browserName: 'chrome',
    version: '1'
  })), 'should match')

  t.not(combined.match(new BrowserSpec({
    browserName: 'chrome',
    version: '2'
  })), 'should match')

  t.end()
})

tape('intersect combines rules together', function (t) {
  setBrowserList({
    'chrome': [
      { 'browserName': 'chrome', 'version': '1' }
    ],
    'safari': [
      { 'browserName': 'safari', 'version': '1' }
    ]
  })

  let matcher1 = new BrowserMatcher()
    .exclude('*')
    .include('chrome')

  let matcher2 = new BrowserMatcher()
    .exclude('*')
    .include('safari')

  let combined = matcher1.intersect(matcher2)

  t.not(combined.match(new BrowserSpec({
    browserName: 'chrome',
    version: '1'
  })), 'should match')

  t.not(combined.match(new BrowserSpec({
    browserName: 'safari',
    version: '1'
  })), 'should match')

  t.end()
})
