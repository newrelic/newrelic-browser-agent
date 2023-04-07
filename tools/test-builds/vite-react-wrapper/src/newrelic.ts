import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"

declare const NREUM: any;

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

new BrowserAgent(opts);
