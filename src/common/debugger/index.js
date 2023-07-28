import { isBrowserScope } from '../constants/runtime'
import { ee } from '../event-emitter/contextual-ee'
import { onWindowLoad } from '../window/load'
import { LocalStorage } from '../storage/local-storage'

export const LOCAL_STORAGE_KEY = 'NRBA_DEBUG'

export const attachDebugger = async (agent) => {
  if (!agent || !agent.agentIdentifier) {
    throw new Error('The debugger can only be attached to an instantiated agent.')
  }

  const localStorage = new LocalStorage()
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

  if (isBrowserScope && localStorage.get(LOCAL_STORAGE_KEY)?.toLowerCase() === 'true') {
    onWindowLoad(async () => {
      try {
        agentDebugger = new (await import(/* webpackChunkName: "debugger" */'./agent-debugger')).AgentDebugger(agent)

        for (let i = 0; i < debugEventQueue.length; i++) {
          agentDebugger.handleEvent(debugEventQueue[i])
        }
      } finally {
        debugEventQueue = null
      }
    })
  }
}
