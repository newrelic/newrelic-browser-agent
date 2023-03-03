/**
 * @file Exposes the agent and available features in multiple forms.
 */

/*
 * The agent is available in four forms for different scenarios.
 *
 *   - `CustomAgent` may be used to load only the desired features.
 *   - `BrowserAgent` turns features on and off through configuration.
 *   - `MicroAgent` is for cases with multiple narrowly-scoped agents per page.
 *   - `WorkerAgent` includes features suitable for a service worker context.
 *
 * The `BrowserAgent` class is the simplest and most reliable option in most cases. For best results, consider the
 * other agent classes only if clearly necessary to support your use case.
 */
export { Agent as CustomAgent } from './loaders/agent'
export { BrowserAgent } from './loaders/browser-agent'
export { MicroAgent } from './loaders/micro-agent'
export { WorkerAgent } from './loaders/worker-agent'

// Features may be imported selectively for use with the CustomAgent class.
export { Instrument as Ajax } from './features/ajax/instrument'
export { Instrument as JSErrors } from './features/ajax/instrument'
export { Instrument as Metrics } from './features/ajax/instrument'
export { Instrument as PageAction } from './features/ajax/instrument'
export { Instrument as PageViewEvent } from './features/ajax/instrument'
export { Instrument as PageViewTiming } from './features/ajax/instrument'
export { Instrument as SessionTrace } from './features/ajax/instrument'
export { Instrument as Spa } from './features/ajax/instrument'
