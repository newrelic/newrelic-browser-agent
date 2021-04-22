/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Use various techniques to determine the time at which this page started and whether to capture navigation timing information

var sHash = require('./s-hash')
var stopwatch = require('./stopwatch')
var loader = require('loader')
var ffVersion = require('../loader/firefox-version')

module.exports = { navCookie: true }

findStartTime()

function findStartTime () {
  var starttime = findStartWebTiming() || findStartCookie()

  if (!starttime) return

  stopwatch.mark('starttime', starttime)
  // Refine loader.offset
  loader.offset = starttime
}

// Find the start time from the Web Timing 'performance' object.
// http://test.w3.org/webperf/specs/NavigationTiming/
// http://blog.chromium.org/2010/07/do-you-know-how-slow-your-web-page-is.html
function findStartWebTiming () {
  // FF 7/8 has a bug with the navigation start time, so use cookie instead of native interface
  if (ffVersion && ffVersion < 9) return

  var performanceCheck = require('performance-check')
  if (performanceCheck.exists) {
    // note that we don't need to use a cookie to record navigation start time
    module.exports.navCookie = false
    return window.performance.timing.navigationStart
  }
}

// Find the start time based on a cookie set by Episodes in the unload handler.
function findStartCookie () {
  var aCookies = document.cookie.split(' ')

  for (var i = 0; i < aCookies.length; i++) {
    if (aCookies[i].indexOf('NREUM=') === 0) {
      var startPage
      var referrerPage
      var aSubCookies = aCookies[i].substring('NREUM='.length).split('&')
      var startTime
      var bReferrerMatch

      for (var j = 0; j < aSubCookies.length; j++) {
        if (aSubCookies[j].indexOf('s=') === 0) {
          startTime = aSubCookies[j].substring(2)
        } else if (aSubCookies[j].indexOf('p=') === 0) {
          referrerPage = aSubCookies[j].substring(2)
          // if the sub-cookie is not the last cookie it will have a trailing ';'
          if (referrerPage.charAt(referrerPage.length - 1) === ';') {
            referrerPage = referrerPage.substr(0, referrerPage.length - 1)
          }
        } else if (aSubCookies[j].indexOf('r=') === 0) {
          startPage = aSubCookies[j].substring(2)
          // if the sub-cookie is not the last cookie it will have a trailing ';'
          if (startPage.charAt(startPage.length - 1) === ';') {
            startPage = startPage.substr(0, startPage.length - 1)
          }
        }
      }

      if (startPage) {
        var docReferrer = sHash(document.referrer)
        bReferrerMatch = (docReferrer == startPage) // eslint-disable-line
        if (!bReferrerMatch) {
          // Navigation did not start at the page that was just exited, check for re-load
          // (i.e. the page just exited is the current page and the referring pages match)
          bReferrerMatch = sHash(document.location.href) == startPage && docReferrer == referrerPage // eslint-disable-line
        }
      }
      if (bReferrerMatch && startTime) {
        var now = new Date().getTime()
        if ((now - startTime) > 60000) {
          return
        }
        return startTime
      }
    }
  }
}
