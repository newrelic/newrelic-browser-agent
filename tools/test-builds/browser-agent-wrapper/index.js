import {BrowserAgent} from '@newrelic/browser-agent/loaders/browser-agent'

const opts = {
    info: NREUM.info,
    init: NREUM.init
}

new BrowserAgent(opts)