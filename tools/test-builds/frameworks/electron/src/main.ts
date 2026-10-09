import "./newrelic";

declare const window: any;

function triggerFeatureEvents() {
  /* no agent until the test suite supplies the agent config (see main.cjs) */
  if (!window.agent) return;
  window.agent?.noticeError("framework-spec-test-error");
  window.agent?.log("framework-spec-test-log");
  window.agent?.addPageAction("framework-spec-test-action");
  /* the page itself is file://, which fetch can't request, so the spec provides an http url on the test asset server */
  fetch(window.nrBootstrap?.fetchUrl).catch(() => {});
}

document.getElementById("app")!.textContent = "Vite Electron";

/* Delay the feature event triggers until after window load so they are separate from the initial
 * page load interaction, same situation and fix as in the Vue and Backbone frameworks. */
const fire = () => setTimeout(triggerFeatureEvents, 0);
if (document.readyState === "complete") {
  fire();
} else {
  window.addEventListener("load", fire, { once: true });
}
