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
    large: { // 19,608 nested objects, including 16,807 (7^5) leaf nodes with string values
      size: 500 * 1024 * 1024, // 500 MB; maximum string length in Chrome is 536.8 million characters
      time_limit: 33 // ms
    },
    // Similar to ordinary-large (99th percentile largest per day) console.log payloads observed in supportability metrics
    medium: { // 1,555 nested objects, including 1,296 (6^4) leaf nodes with string values
      size: 2 * 1024 * 1024, // 2 MB
      time_limit: 9 // ms
    },
    // A good-sized console.log payload of a length suitable for reading by a human
    small: { // 40 nested objects, including 27 (3^3) leaf nodes with string values
      size: 1 * 1024, // 1 KB
      time_limit: 7 // ms
    }
  }

  /*
    Performance benchmarks for longest millisecond times in 12 runs

    | Current Wrapped Performance             | Stringify Method       | Baseline (Not Wrapped) |
    |----------------|-------|--------|-------|-------|--------|-------|-------|--------|-------|
    | Browser        | Large | Medium | Small | Large | Medium | Small | Large | Medium | Small |
    |----------------|-------|--------|-------|-------|--------|-------|-------|--------|-------|
    | firefox@latest |    11 |      3 |     2 |  1458 |      9 |     2 |     0 |      0 |     0 |
    | chrome@latest  |    11 |      4 |     2 |  3288 |     21 |     2 |     3 |      1 |     2 |
    | safari@latest  |    18 |      3 |     2 |  3969 |     12 |     2 |     0 |      0 |     0 |
    | edge@latest    |    12 |      3 |     3 |  2666 |     11 |     2 |     3 |      1 |     2 |
    | ios@latest     |    30 |      6 |     6 |  3184 |     20 |     4 |     5 |      3 |     2 |
    | ie@11          |    24 |      8 |     1 |  2712 |     16 |     1 |     1 |      1 |     1 |
    |----------------|-------|--------|-------|-------|--------|-------|-------|--------|-------|
    | largest + 10%  |    33 |      9 |     7 |  4366 |     24 |     5 |     6 |      4 |     3 |

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
