import { BrowserAgent } from "@newrelic/browser-agent/src/loader";

const configs = {
    init: { ajax: { enabled: false }, jserrors: {auto: false, enabled: true} },
    info: { applicationID: '601303348', licenseKey: 'a60cc46d05', errorBeacon: 'bam.nr-data.net' }
}
window.agent = new BrowserAgent(configs)