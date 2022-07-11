
import { onWindowLoad } from '@newrelic/browser-agent-core/common/window/load'

let loadFired = 0

export function stageAggregator(loaderType, useTimeout, ms) {
    if (useTimeout) setTimeout(() => importAggregator(loaderType), ms || 1000) // used just for local testing injecting the script after window load...
    else onWindowLoad(importAggregator(loaderType)) // inject the aggregator when window load event fires
}

function importAggregator(loaderType) {
    setTimeout(async () => {
        if (loadFired++) return
        const { aggregator } = await import('../../agent-aggregator/aggregator')
        aggregator(loaderType)
    }, 0)
}