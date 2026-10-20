<script context="module">
  declare const window: any;
</script>

<script lang="ts">
  import { onMount } from "svelte";

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
  * We use onMount for the same reasoning as in the Vue app: to avoid associating
  * the ajax call with the initial page load interaction.
  */
  onMount(() => {
    const fire = () => setTimeout(triggerFeatureEvents, 0);
    if (document.readyState === "complete") {
      fire();
    } else {
      window.addEventListener("load", fire, { once: true });
    }
  });
</script>

<div>Vite Svelte</div>
