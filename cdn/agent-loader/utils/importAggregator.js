
import { onWindowLoad } from '@newrelic/browser-agent-core/common/window/load'
import { isBrowserWindow } from '@newrelic/browser-agent-core/common/window/win'
import { ee } from '@newrelic/browser-agent-core/common/event-emitter/contextual-ee'

let loadFired = 0

export function stageAggregator(loaderType, useTimeout, ms = 1000) {
    if (useTimeout) setTimeout(() => importAggregator(loaderType), ms) // used just for local testing injecting the script after window load...
    else if (!isBrowserWindow) importAggregator(loaderType);    // run now if there's no window (to load)
    else onWindowLoad(() => importAggregator(loaderType)) // inject the aggregator when window load event fires
}

function importAggregator(loaderType) {
    (async () => {
        if (loadFired++) return
        try {
            const { aggregator } = await import('../../agent-aggregator/aggregator')
            await aggregator(loaderType)
        } catch (err) {
            console.error("Failed to successfully load all aggregators. Aborting...\n", err);
            ee.abort(); // halt event emitter primary functions
        }
    })();
}