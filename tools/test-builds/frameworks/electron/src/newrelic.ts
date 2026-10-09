import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"

declare const window: any;

/* window.nrBootstrap is the NREUM info/init handed over by the preload script (see main.cjs).
 * It is absent until the test suite supplies it, in which case no agent is started. */
/* contextBridge hands over a frozen object, and the agent adds to the config it is given, so use a copy */
const bootstrap = window.nrBootstrap && structuredClone(window.nrBootstrap);

if (bootstrap) {
  window.agent = new BrowserAgent({ info: bootstrap.info, init: bootstrap.init });
  window.agent.setPageViewName('framework-electron');
}
