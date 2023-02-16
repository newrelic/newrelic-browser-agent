/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
const testDriver = require('../../../tools/jil')
const querypack = require('@newrelic/nr-querypack')

const supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('ajax in deny list is not harvested with interaction', supported, function (t, browser, router) {
  var cases = [
    {
      name: 'no deny list',
      denyList: [],
      expected: {
        type: 'interaction',
        children: [
          {
            type: 'ajax',
            path: '/json',
            children: [
              {
                type: 'ajax',
                path: '/text'
              }
            ]
          }
        ]
      }
    },
    {
      name: 'node at the end of tree branch',
      denyList: ['bam-test-1.nr-local.net/text'],
      expected: {
        type: 'interaction',
        children: [
          {
            type: 'ajax',
            path: '/json'
          }
        ]
      }
    },
    {
      name: 'node in the middle of tree branch',
      denyList: ['bam-test-1.nr-local.net/json'],
      expected: {
        type: 'interaction',
        children: [
          {
            type: 'ajax',
            path: '/text'
          }
        ]
      }
    }
  ]

  cases.forEach(testCase => {
    t.test(testCase.name, function (t) {
      let rumPromise = router.expectRum()
      let eventsPromise = router.expectInteractionEvents()
      let loadPromise = browser.safeGet(router.assetURL('spa/ajax-deny-list.html', {
        loader: 'spa',
        init: {
          ajax: {
            deny_list: testCase.denyList,
            enabled: true
          },
          page_view_timing: {
            enabled: false
          },
          metrics: {
            enabled: false
          }
        }
      })).waitForFeature('loaded')

      Promise.all([eventsPromise, rumPromise, loadPromise])
        .then(([{ request: eventsResult }]) => {
          var query = eventsResult.query
          var body = eventsResult.body
          let interaction = querypack.decode(body && body.length ? body : query.e)[0]

          validateNode(t, testCase.expected, interaction)

          t.end()
        })
        .catch(fail)

      function fail (err) {
        t.error(err)
        t.end()
      }
    })
  })
})

// validates only keys defined in the expected object
// validates children recursively, including children not present
function validateNode (t, expected, actual) {
  for (var key in expected) {
    var expectedVal = expected[key]

    if (key === 'children') {
      expectedVal.forEach((expectedChild, index) => {
        validateNode(t, expectedChild, actual.children[index])
      })
    } else {
      t.equals(expectedVal, actual[key], key)
    }
  }

  if (!expected.children || expected.children.length === 0) {
    t.equals(0, actual.children.length, 'there should be no children')
  }
}
