const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { fail, testCases, validateNewrelicHeader, validateNoNewrelicHeader, validateTraceContextHeaders, validateNoTraceContextHeaders } = require('../xhr/helpers')

const fetchBrowsers = testDriver.Matcher.withFeature('fetch')

workerTypes.forEach(type => {
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  testCases.forEach((testCase) => {
    if (testCase.sameOrigin) return	// can't use router's origin
    fetchDTHeader(type, testCase, browsersWithOrWithoutModuleSupport.and(fetchBrowsers))
  })
})

function fetchDTHeader (type, testCase, browserVersionMatcher) {
  testDriver.test(`${type} - ${testCase.name}`, browserVersionMatcher,
    function (t, browser, router) {
      const config = {
        accountID: '1234',
        agentID: '2468',
        trustKey: '1'
      }
      // create init configuration from test case
      let init = {
        jserrors: { harvestTimeSeconds: 80 },
        ajax: { harvestTimeSeconds: 80 }
      }
      if (testCase.configuration) {
        init.distributed_tracing = testCase.configuration
        if (testCase.addRouterToAllowedOrigins) {
          init.distributed_tracing.allowed_origins.push('http://' + router.testServer.bamServer.host + ':' + router.testServer.bamServer.port)
        }
      }
      const scenarios = [
        {
          name: 'when fetch is called with one string argument',
          fetchTest: () => {
            var url = 'http://' + NREUM.info.beacon + '/dt/' + self.testId
      			fetch(url)
          }
        },
        {
          name: 'when fetch is called with URL string and options arguments',
          fetchTest: () => {
            var url = 'http://' + NREUM.info.beacon + '/dt/' + self.testId
            var headers = new Headers()
            var init = { headers: headers }
            fetch(url, init)
          }
        },
        {
          name: 'when fetch is called with a Request argument',
          fetchTest: () => {
            var url = 'http://' + NREUM.info.beacon + '/dt/' + self.testId
            var request = new Request(url)
            fetch(request)
          }
        },
        {
          name: 'when fetch is called with a URL object argument',
          fetchTest: () => {
            var urlString = 'http://' + NREUM.info.beacon + '/dt/' + self.testId
            var url = new URL(urlString)
            fetch(url)
          }
        }
      ]

      scenarios.forEach((scenario) => {
        t.test(`${type} - ${scenario.name}`, (t) => {
          let assetURL = router.assetURL(`worker/${type}-worker.html`, {
            config,
            init,
            testId: router.testId,
            injectUpdatedLoaderConfig: true,
            workerCommands: [
							`self.testId = '${router.testId}'`,
							scenario.fetchTest
            ].map(x => x.toString())
          })

          const loadPromise = browser.get(assetURL)
          const ajaxPromise = router.expect('bamServer', {
            test: function (request) {
              const url = new URL(request.url, 'resolve://')
              return url.pathname === `/dt/${router.testId}`
            }
          })

          Promise.all([ajaxPromise, loadPromise, router.expectRum()])
            .then(([{ request: { headers } }]) => {
              if (testCase.newrelicHeader) {
                validateNewrelicHeader(t, headers, config)
              } else {
                validateNoNewrelicHeader(t, headers)
              }

              if (testCase.traceContextHeaders) {
                validateTraceContextHeaders(t, headers, config)
              } else {
                validateNoTraceContextHeaders(t, headers)
              }
              t.end()
            }).catch(fail(t))
        })
      })
    }
  )
}
