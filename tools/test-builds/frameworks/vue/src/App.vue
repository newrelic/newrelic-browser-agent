<script setup lang="ts">
import { onMounted } from "vue";

declare const window: any;

/*
 * Exercises the agent APIs that don't fire automatically on page load, so the
 * framework informational test suite can confirm ajax/jserrors/logging/page-action
 * events are captured for this framework build too.
 */
function triggerFeatureEvents() {
  window.agent?.noticeError("framework-spec-test-error");
  window.agent?.log("framework-spec-test-log");
  window.agent?.addPageAction("framework-spec-test-action");
  fetch(window.location.href).catch(() => {});
}

/*
 * Vue's onMounted fires synchronously during createApp().mount(), well before the
 * window "load" event - unlike React's useEffect, which React defers past the initial
 * paint/commit. Soft nav closes its "initial page load" interaction on "load", and an
 * ajax call made while that interaction is still open gets attributed as a child of
 * it instead of being reported as its own standalone ajax harvest event.
 *
 * Deferring to "load" alone isn't enough: the agent's own interaction-closing logic
 * is itself a "load" listener, and plain listener order between it and ours isn't
 * guaranteed. A setTimeout scheduled from the "load" handler (or immediately, if
 * "load" already happened) is a macrotask, so it's guaranteed to run only after every
 * synchronous "load" listener - including the agent's - has already finished, which
 * reliably places the trigger outside the now-closed interaction window.
 */
onMounted(() => {
  const fire = () => setTimeout(triggerFeatureEvents, 0);
  if (document.readyState === "complete") {
    fire();
  } else {
    window.addEventListener("load", fire, { once: true });
  }
});
</script>

<template>
  <div>Vite Vue</div>
</template>
