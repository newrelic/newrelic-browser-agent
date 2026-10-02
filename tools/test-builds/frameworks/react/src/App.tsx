import { useEffect } from "react";

declare const window: any;

// Exercises the agent APIs that don't fire automatically on page load, so the
// framework informational test suite can confirm ajax/jserrors/logging/page-action
// events are captured for this framework build too. Fired from an effect during
// initial mount (not a click handler) so soft-nav doesn't attribute these to a
// separate, possibly-never-resolving interaction - it should instead ride along
// with the fast-resolving "initial page load" interaction.
function triggerFeatureEvents() {
  window.agent?.noticeError("framework-spec-test-error");
  window.agent?.log("framework-spec-test-log");
  window.agent?.addPageAction("framework-spec-test-action");
  fetch(window.location.href).catch(() => {});
}

export function App() {
  useEffect(() => {
    triggerFeatureEvents();
  }, []);

  return <div>Vite React</div>;
}
