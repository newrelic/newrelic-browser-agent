const testDriver = require("../../../tools/jil");
const fetchBrowsers = testDriver.Matcher.withFeature("fetch");

testDriver.test(
  "XHR ajax events deny bam server",
  function (t, browser, router) {
    const ajaxPromise = router.expectXHRMetrics();
    const rumPromise = router.expectRum();
    const loadPromise = browser.safeGet(
      router.assetURL("instrumented.html", {
        init: {
          ajax: {
            harvestTimeSeconds: 2,
            enabled: true,
            deny_list: [router.router.assetServer.host],
          },
        },
        scriptString: `
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://example.com/');
      xhr.send();
    `,
      })
    );

    Promise.all([ajaxPromise, loadPromise, rumPromise])
      .then(([response]) => {
        const newAjaxPromise = router
          .expectBeaconRequest(router.beaconRequests.errors, 5000)
          .then(() => {
            t.fail("Should not have seen another ajax event");
          })
          .catch(() => {});

        const ajaxData = JSON.parse(response.body).xhr;
        t.ok(ajaxData.length === 1, "XMLHttpRequest ajax event was harvested");

        return newAjaxPromise;
      })
      .then(() => {
        t.end();
      });
  }
);

testDriver.test(
  "Fetch ajax events deny bam server",
  fetchBrowsers,
  function (t, browser, router) {
    const ajaxPromise = router.expectXHRMetrics();
    const rumPromise = router.expectRum();
    const loadPromise = browser.safeGet(
      router.assetURL("instrumented.html", {
        init: {
          ajax: {
            harvestTimeSeconds: 2,
            enabled: true,
            deny_list: [router.router.assetServer.host],
          },
        },
        scriptString: `
      fetch('http://example.com').then(function() {}).catch(function() {})
    `,
      })
    );

    Promise.all([ajaxPromise, loadPromise, rumPromise])
      .then(([response]) => {
        const newAjaxPromise = router
          .expectBeaconRequest(router.beaconRequests.errors, 5000)
          .then(() => {
            t.fail("Should not have seen another ajax event");
          })
          .catch(() => {});

        const ajaxData = JSON.parse(response.body).xhr;
        t.ok(ajaxData.length === 1, "Fetch ajax event was harvested");

        return newAjaxPromise;
      })
      .then(() => {
        t.end();
      });
  }
);
