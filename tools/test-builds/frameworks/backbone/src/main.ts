import "./newrelic";

import Backbone from 'backbone';
import $ from 'jquery';

declare const window: any;

function triggerFeatureEvents() {
  window.agent?.noticeError("framework-spec-test-error");
  window.agent?.log("framework-spec-test-log");
  window.agent?.addPageAction("framework-spec-test-action");
  fetch(window.location.href).catch(() => {});
}

// Attach jQuery to Backbone
Backbone.$ = $;

const AppView = Backbone.View.extend({
  /* initialize() runs too early to where the ajax event is tied to the initial page load,
   * and there is no good alternative in the View class functions, so we are delaying the
   * feature event triggers until the document is ready so that it is separate from the
   * initial page load interaction. Same situation and fix as in the Vue framework.
   */
  initialize: function () {
    const fire = () => setTimeout(triggerFeatureEvents, 0);
    if (document.readyState === "complete") {
      fire();
    } else {
      window.addEventListener("load", fire, { once: true });
    }
  },
  render: function () {
    this.$el.html("<div>Vite Backbone</div>");
    return this;
  }
});

const mainApp = new AppView({
  el: "#app"
});

mainApp.render();
