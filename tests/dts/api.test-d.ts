import { BrowserAgent } from '../../dist/types/loaders/browser-agent'
import { MicroAgent } from '../../dist/types/loaders/micro-agent'
import { InteractionInstance, getContext, onEnd } from '../../dist/types/loaders/api/interaction-types'
import { expectType } from 'tsd'

const validOptions = {
  info: {
    applicationID: '12345',
    licenseKey: 'abcde'
  }
}

// Browser Agent APIs
const browserAgent = new BrowserAgent(validOptions)
expectType<BrowserAgent>(browserAgent)
const microAgent = new MicroAgent(validOptions)
expectType<MicroAgent>(microAgent)

;[browserAgent, microAgent].forEach((agent) => {
  expectType<(customAttributes: {
    name: string;
    start: number;
    end?: number;
    origin?: string;
    type?: string;
  }) => any>(agent.addToTrace)
  expectType<(name: string) => any>(agent.setCurrentRouteName)
  expectType<() => InteractionInstance>(agent.interaction)
  
  // Base Agent APIs
  expectType<(name: string, attributes?: object) => any>(agent.addPageAction)
  expectType<(name: string, host?: string) => any>(agent.setPageViewName)
  expectType<(name: string, value: string | number | boolean | null, persist?: boolean) => any>(agent.setCustomAttribute)
  expectType<(error: Error | string, customAttributes?: object) => any>(agent.noticeError)
  expectType<(value: string | null) => any>(agent.setUserId)
  expectType<(value: string | null) => any>(agent.setApplicationVersion)
  expectType<(callback: (error: Error | string) => boolean | { group: string; }) => any>(agent.setErrorHandler)
  expectType<(timeStamp?: number) => any>(agent.finished)
  expectType<(name: string, id: string) => any>(agent.addRelease)
  /** micro agent has a different implementation of start api we are stuck with until that entry point is removed */
  expectType<(() => any) | ((featureNames?: string | string[] | undefined) => boolean)>(agent.start)
  expectType<() => any>(agent.recordReplay)
  expectType<() => any>(agent.pauseReplay)
  expectType<(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => any>(agent.log)
  expectType<(parent: object, functionName: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => any>(agent.wrapLogger)
  
  // SPA APIs
  expectType<() => InteractionInstance>(agent.interaction)
  expectType<(value: string) => InteractionInstance>(agent.interaction().actionText)
  expectType<(name: string, callback?: ((...args: any[]) => any)) => (...args: any) => any>(agent.interaction().createTracer)
  expectType<() => InteractionInstance>(agent.interaction().end)
  expectType<getContext>(agent.interaction().getContext)
  expectType<() => InteractionInstance>(agent.interaction().ignore)
  expectType<onEnd>(agent.interaction().onEnd)
  expectType<(key: string, value: any) => InteractionInstance>(agent.interaction().setAttribute)
  expectType<(name: string, trigger?: string) => InteractionInstance>(agent.interaction().setName)
})


