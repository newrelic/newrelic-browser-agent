import { BrowserAgent } from "@newrelic/browser-agent/src/microfrontend-loader";
import { gosCDN } from '@newrelic/browser-agent-core/src/common/window/nreum'

const nr = gosCDN()
nr.mfeLoader = BrowserAgent