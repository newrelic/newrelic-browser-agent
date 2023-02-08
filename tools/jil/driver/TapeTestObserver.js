function observe(t, finishedCallback, resultCallback) {
  var allOk = true;
  observeTapeTest(t, false);

  function observeTapeTest(t, isChild) {
    t.on('end', function () {
      onTestFinished(t, !!isChild);
    });

    t.on('result', function (result) {
      if (resultCallback) {
        resultCallback(result);
      }
    });

    t.on('test', function (childTest) {
      observeTapeTest(childTest, true);
    });
  }

  function onTestFinished(t, isChild) {
    let plannedOk = !t._plan || t._plan <= t.assertCount;
    let allAssertsOk = t._ok;
    allOk = allOk && allAssertsOk && plannedOk;

    if (!isChild) {
      if (!plannedOk) {
        t.once('result', function () {
          if (t.error) {
            allOk = false;
          }
          finishedCallback(allOk, t);
        });
      } else {
        finishedCallback(allOk, t);
      }
    }
  }
}

module.exports = observe;
