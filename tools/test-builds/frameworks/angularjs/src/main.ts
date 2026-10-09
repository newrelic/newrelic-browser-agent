import "./newrelic";

declare const window: any;

function triggerFeatureEvents() {
  window.agent?.noticeError("framework-spec-test-error");
  window.agent?.log("framework-spec-test-log");
  window.agent?.addPageAction("framework-spec-test-action");
  fetch(window.location.href).catch(() => {});
}

/* AngularJS self-bootstraps the ng-app in index.html on document ready, before this module's
 * top-level code runs, so there is no early-lifecycle hook to avoid here the way Backbone/Vue
 * need one - this still waits for "load" so the ajax trigger below rides along with the
 * already-fast "initial page load" interaction instead of firing before the page is settled.
 */
function fireOnceReady() {
  const fire = () => setTimeout(triggerFeatureEvents, 0);
  if (document.readyState === "complete") {
    fire();
  } else {
    window.addEventListener("load", fire, { once: true });
  }
}

fireOnceReady();
