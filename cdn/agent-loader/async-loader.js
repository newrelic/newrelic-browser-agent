import { BrowserAgent } from "@newrelic/browser-agent/src/index";
import { gosCDN } from "@newrelic/browser-agent-core/src/common/window/nreum";

const ba = new BrowserAgent()
ba.start(gosCDN()).then(initialized => {
    console.log("ba", ba)
})