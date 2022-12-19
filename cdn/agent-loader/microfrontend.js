import { BrowserAgent } from "@newrelic/browser-agent/src/microfrontend-loader";

const configs = {
    info: { applicationID: '601303348', licenseKey: 'a60cc46d05', errorBeacon: 'bam.nr-data.net' }
}
window.agent = new BrowserAgent(configs)

const configs2 = {
    info: { applicationID: '35095249', licenseKey: '2fec6ab188', errorBeacon: 'staging-bam-cell.nr-data.net' }
}
window.agent2 = new BrowserAgent(configs2)