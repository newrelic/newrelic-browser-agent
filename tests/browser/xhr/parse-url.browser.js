/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../../tools/jil/browser-test'
import { parseUrl } from '../../../packages/browser-agent-core/common/url/parse-url'

if (window.XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.addEventListener) xhr_tests()
else {
  test('skipping because browser does not have xhr and addEventListener', function (t) {
    t.skip('no tests for this browser')
    t.end()
  })
}

function xhr_tests () {
  var testToRepeat = {
    url: 'http://example.com/',
    results: {
      hostname: 'example.com',
      pathname: '/',
      protocol: 'http',
      port: '80',
      sameOrigin: false
    }
  }

  test('xhr parseUrl', function (t) {
    var tests = [
      {
        url: 'http://example.com/path/name?qs=5&a=b',
        results: {
          hostname: 'example.com',
          pathname: '/path/name',
          protocol: 'http',
          port: '80',
          sameOrigin: false
        }
      },
      testToRepeat,
      testToRepeat, // Make sure caching works for urls without paths
      {
        url: 'http://foo:bar@example.com:8080/path/@name?qs=5&a=b',
        results: {
          hostname: 'example.com',
          pathname: '/path/@name',
          protocol: 'http',
          port: '8080',
          sameOrigin: false
        }
      },
      {
        url: 'https://foo:bar@example.com/path/name?qs=5&a=b',
        results: {
          hostname: 'example.com',
          pathname: '/path/name',
          protocol: 'https',
          port: '443',
          sameOrigin: false
        }
      },
      {
        url: '/path/name?qs=5&a=b',
        results: {
          hostname: location.hostname,
          pathname: '/path/name',
          protocol: location.protocol.split(':')[0],
          port: location.port,
          sameOrigin: true
        }
      },
      {
        url: location.protocol + '//' + location.hostname + ':' + location.port + '/path/name?qs=5&a=b',
        results: {
          hostname: location.hostname,
          pathname: '/path/name',
          protocol: location.protocol.split(':')[0],
          port: location.port,
          sameOrigin: true
        }
      },
      {
        url: 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
        results: {
          protocol: 'data'
        }
      }
    ]

    for (var i = 0; i < tests.length; i++) {
      executeTest(tests[i])
    }

    function executeTest (example) {
      var isEdge = navigator.userAgent.match(/Edge\/\d+/)
      if (example.url.indexOf('@') !== -1 && isEdge) {
        // Edge does not allow you to read properties from an HTMLAnchorElement
        // where the href contains credentials. See:
        // https://connect.microsoft.com/IE/feedbackdetail/view/2011466/accessing-properties-of-an-htmlanchorelement-with-an-embedded-username-results-in-a-security-error
        t.skip('skipping URL parsing test with credentials in URL on MS Edge')
      } else {
        t.deepEqual(parseUrl(example.url), example.results, 'parsed url ' + example.url + ' correctly')
      }
    }

    t.end()
  })
}
