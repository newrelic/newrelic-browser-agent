import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"

declare const NREUM: any;
declare const window: any;

const opts = {
  info: NREUM.info,
  init: {...NREUM.init, feature_flags: ['register']}
}

window.agent = new BrowserAgent(opts);
window.agent.setPageViewName('vite-react-wrapper');
