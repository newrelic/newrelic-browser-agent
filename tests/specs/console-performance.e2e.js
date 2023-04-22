describe('console method observation', () => {
  let testHandle
  const init = {
    ajax: { deny_list: [], harvestTimeSeconds: 2 },
    jserrors: { harvestTimeSeconds: 2 },
    metrics: { harvestTimeSeconds: 2 },
    page_action: { harvestTimeSeconds: 2 },
    page_view_timing: { harvestTimeSeconds: 2 },
    session_trace: { harvestTimeSeconds: 2 },
    spa: { harvestTimeSeconds: 2 }
  }

  const testConfigs = {
    // Similar to very-large (1st percentile largest per day) console.log payloads observed in supportability metrics
    large: {
      size: 500 * 1024 * 1024, // 500 MB; maximum string length in Chrome is 536.8 million characters
      time_limit: 29 // ms
    },
    // Similar to ordinary-large (99th percentile largest per day) console.log payloads observed in supportability metrics
    medium: {
      size: 2 * 1024 * 1024, // 2 MB
      time_limit: 20 // ms
    },
    // A good-sized console.log payload of a length suitable for reading by a human
    small: {
      size: 1 * 1024, // 1 KB
      time_limit: 4 // ms
    }
  }

  /*
    Benchmarks for longest times in 12 runs

    | Browser        | Large | Medium | Small |
    |----------------|-------|--------|-------|
    | firefox@latest |    16 |     16 |     3 |
    | chrome@latest  |     7 |      5 |     2 |
    | safari@latest  |     7 |      4 |     3 |
    | edge@latest    |     6 |      5 |     2 |
    | ios@latest     |    12 |      7 |     2 |
    | ie@11          |    26 |     18 |     2 |
    |----------------|-------|--------|-------|
    | largest + 10%  |    29 |     20 |     4 |

    Time limits in testConfig are set to 10% more than the largest value for any browser, rounded up to the millisecond.
  */

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  for (const relativeSize in testConfigs) {
    const testConfig = testConfigs[relativeSize]

    it(`should log a ${relativeSize} object (${testConfig.size / 1024} KB) in less then ${testConfig.time_limit} ms`, async () => {
      const url = await testHandle.assetURL('console-methods.html', {
        loader: 'spa',
        init
      })

      await Promise.all([
        testHandle.expectRum(),
        browser.url(url)
      ])
      const result = await browser.execute(function (testConfig) {
        var testObject = generateObject(testConfig.size)
        var start = window.performance.now()
        console.log(testObject) // invokes our wrapper
        var end = window.performance.now()

        return end - start
      }, testConfig)

      expect(result).toBeLessThan(testConfig.time_limit)
    })
  }
})
