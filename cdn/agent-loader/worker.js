import { BrowserAgent } from "@newrelic/browser-agent-core/common/loader/sync-loader";
import { gosCDN } from "@newrelic/browser-agent-core/common/window/nreum";

const ba = new BrowserAgent()
const nr = gosCDN()
nr.init = { ...nr.init, page_view_event: { enabled: false }, page_view_timing: { enabled: false }, session_trace: { enabled: false }, spa: { enabled: false } }
ba.start(nr).then(initialized => {
    console.log("ba", ba)
})

