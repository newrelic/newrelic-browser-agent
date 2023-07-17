import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"

declare const NREUM: any;

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

const agent = new BrowserAgent(opts);
agent.setPageViewName('vite-react-wrapper');
