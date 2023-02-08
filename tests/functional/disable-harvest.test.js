const testDriver = require("jil");

let supported = testDriver.Matcher.withFeature("notInternetExplorer");

var timedPromiseAll = (promises, ms = 5000) =>
  Promise.race([
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject();
      }, ms);
    }),
    Promise.all(promises),
  ]);

testDriver.test("METRICS, ERRORS - Kills feature if entitlements flag is 0", supported, function (t, browser, router) {
  const init = {
    metrics: { enabled: true, harvestTimeSeconds: 5 },
    jserrors: { enabled: true, harvestTimeSeconds: 5 },
  };

  router.flags.err = 0;
  const assetURL = router.assetURL("obfuscate-pii.html", {
    loader: "full",
    init,
  });
  const rumPromise = router.expectRum();
  const loadPromise = browser.get(assetURL);
  const metricsPromise = router.expectMetrics();
  const errorsPromise = router.expectErrors();

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      timedPromiseAll([metricsPromise, errorsPromise], 6000)
        .then(([metrics, errors]) => {
          t.fail("should not have recieved metrics or errors");
        })
        .catch(() => {
          t.pass("did not recieve metrics or errors :)");
        })
        .finally(() => {
          t.end();
        });
    })
    .catch(fail);

  function fail(err) {
    t.error(err);
    t.end();
  }
});

testDriver.test("SPA - Kills feature if entitlements flag is 0", supported, function (t, browser, router) {
  const init = {
    ajax: { enabled: false, harvestTimeSeconds: 5 },
    spa: { enabled: true, harvestTimeSeconds: 5 },
    page_view_timing: { enabled: false, harvestTimeSeconds: 5 },
  };

  router.flags.spa = 0;
  const assetURL = router.assetURL("obfuscate-pii.html", {
    loader: "spa",
    init,
  });
  const rumPromise = router.expectRum();
  const loadPromise = browser.get(assetURL);
  const spaPromise = router.expectEvents();

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      timedPromiseAll([spaPromise], 6000)
        .then(() => {
          t.fail("should not have recieved spa data");
        })
        .catch(() => {
          t.pass("did not recieve spa data :)");
        })
        .finally(() => {
          t.end();
        });
    })
    .catch(fail);

  function fail(err) {
    t.error(err);
    t.end();
  }
});

testDriver.test("PAGE ACTIONS - Kills feature if entitlements flag is 0", supported, function (t, browser, router) {
  const init = {
    page_action: { enabled: true, harvestTimeSeconds: 5 },
  };

  router.flags.ins = 0;
  const assetURL = router.assetURL("obfuscate-pii.html", {
    loader: "full",
    init,
  });
  const rumPromise = router.expectRum();
  const loadPromise = browser.get(assetURL);
  const insPromise = router.expectIns();

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      timedPromiseAll([insPromise], 6000)
        .then(() => {
          t.fail("should not have recieved page action");
        })
        .catch(() => {
          t.pass("did not recieve page action data :)");
        })
        .finally(() => {
          t.end();
        });
    })
    .catch(fail);

  function fail(err) {
    t.error(err);
    t.end();
  }
});
