
import { onWindowLoad } from '@newrelic/browser-agent-core/common/window/load'
import { configure } from './configure'

const priority = {
    lite: 1,
    pro: 2,
    spa: 3
}
let loadFired = 0
let aggregatorType = null
let configured = false

export function stageAggregator(loaderType, useTimeout, ms) {
    configure()
    prioritizeAggregator(loaderType)
    if (useTimeout) setTimeout(() => importAggregator(aggregatorType), ms || 1000) // used just for local testing injecting the script after window load...
    else onWindowLoad(importAggregator(aggregatorType)) // inject the aggregator when window load event fires
}

function prioritizeAggregator(loaderType) {
    if (!aggregatorType || priority[loaderType] > priority[aggregatorType]) aggregatorType = loaderType
}

async function importAggregator(loaderType) {
    if (loaderType !== aggregatorType) return
    if (loadFired++) return
    console.log("import the aggregator -- ", loaderType)
    const { aggregator } = await import('../../agent-aggregator/aggregator')
    aggregator(loaderType)
}