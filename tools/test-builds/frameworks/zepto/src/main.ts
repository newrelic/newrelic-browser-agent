import "./newrelic";

declare const window: any;

/*
 * Exercises the agent APIs that don't fire automatically on page load, so the
 * framework informational test suite can confirm ajax/jserrors/logging/page-action
 * events are captured for this framework build too.
 */
function triggerFeatureEvents() {
  window.agent?.noticeError("framework-spec-test-error");
  window.agent?.log("framework-spec-test-log");
  window.$.each(['a', 'b', 'c'], function(index: number, item: string){
    console.log('item %d is: %s', index, item)
  })
  window.agent?.addPageAction("framework-spec-test-action");
  fetch(window.location.href).catch(() => {});
}

/* Wait until page "load" event has fired before issuing Ajax and other test calls
to ensure Ajax harvest is standalone and not part of SoftNav. */
function fireOnceReady() {
  const fire = () => setTimeout(() => {
    window.$('#app').text('Vite Zepto');
    triggerFeatureEvents()
  }, 0);

  if (document.readyState === "complete") {
    fire();
  } else {
    window.addEventListener("load", fire, { once: true });
  }
}

fireOnceReady();
