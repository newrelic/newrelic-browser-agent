import { globalScope, isBrowserScope } from '../constants/runtime'
import { ee } from '../event-emitter/contextual-ee'
import { onWindowLoad } from '../window/load'
import { warn } from '../util/console'

export const LOCAL_STORAGE_KEY = 'NRBA_DEBUG'

export const attachDebugger = async (agent) => {
  if (!agent || !agent.agentIdentifier) {
    warn('The debugger can only be attached to an instantiated agent.')
    return
  }

  if (!isBrowserScope) return

  let agentDebugger
  let debugEventQueue = []

  const eventEmitter = ee.get(agent.agentIdentifier)
  eventEmitter.addEventListener('debugger', (debugEventDetails) => {
    if (agentDebugger) {
      agentDebugger.handleEvent(debugEventDetails)
    } else if (Array.isArray(debugEventQueue)) {
      debugEventQueue.push(debugEventDetails)
    }
  })

  onWindowLoad(async () => {
    try {
      if (globalScope.localStorage.getItem(LOCAL_STORAGE_KEY)?.toLowerCase() !== 'true') return

      agentDebugger = new (await import(/* webpackChunkName: "debugger" */'./agent-debugger')).AgentDebugger(agent)

      for (let i = 0; i < debugEventQueue.length; i++) {
        agentDebugger.handleEvent(debugEventQueue[i])
      }
    } catch (e) {
      // Swallow any error regarding initializing the debugger
    } finally {
      debugEventQueue = null
    }
  })
}
