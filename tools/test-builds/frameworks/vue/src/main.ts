// Make sure newrelic is the first thing imported
import "./newrelic";

import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");
