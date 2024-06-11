import { BrowserAgent } from '../../dist/types/loaders/browser-agent'
import { MicroAgent } from '../../dist/types/loaders/micro-agent'
import { InteractionInstance, getContext, onEnd } from '../../dist/types/loaders/api/interaction-types'
import { expectType } from 'tsd'

// Browser Agent APIs
const browserAgent = new BrowserAgent({})
expectType<BrowserAgent>(browserAgent)
expectType<(customAttributes: {
  name: string;
  start: number;
  end?: number;
  origin?: string;
  type?: string;
}) => any>(browserAgent.addToTrace)
expectType<(name: string) => any>(browserAgent.setCurrentRouteName)
expectType<() => InteractionInstance>(browserAgent.interaction)

// Base Agent APIs
expectType<(name: string, attributes?: object | undefined) => any>(browserAgent.addPageAction)
expectType<(name: string, host?: string | undefined) => any>(browserAgent.setPageViewName)
expectType<(name: string, value: string | number | boolean | null, persist?: boolean | undefined) => any>(browserAgent.setCustomAttribute)
expectType<(error: Error | string, customAttributes?: object | undefined) => any>(browserAgent.noticeError)
expectType<(value: string | null) => any>(browserAgent.setUserId)
expectType<(value: string | null) => any>(browserAgent.setApplicationVersion)
expectType<(callback: (error: Error | string) => boolean | { group: string; }) => any>(browserAgent.setErrorHandler)
expectType<(timeStamp?: number | undefined) => any>(browserAgent.finished)
expectType<(name: string, id: string) => any>(browserAgent.addRelease)

// SPA APIs
expectType<() => InteractionInstance>(browserAgent.interaction)
expectType<(value: string) => InteractionInstance>(browserAgent.interaction().actionText)
expectType<(name: string, callback?: ((...args: any[]) => any) | undefined) => (...args: any) => any>(browserAgent.interaction().createTracer)
expectType<() => InteractionInstance>(browserAgent.interaction().end)
expectType<getContext>(browserAgent.interaction().getContext)
expectType<() => InteractionInstance>(browserAgent.interaction().ignore)
expectType<onEnd>(browserAgent.interaction().onEnd)
expectType<(key: string, value: any) => InteractionInstance>(browserAgent.interaction().setAttribute)
expectType<(name: string, trigger?: string | undefined) => InteractionInstance>(browserAgent.interaction().setName)

// Micro Agent APIs
const microAgent = new MicroAgent({})
expectType<(customAttributes: {
  name: string;
  start: number;
  end?: number;
  origin?: string;
  type?: string;
  // @ts-ignore
}) => any>(microAgent.addToTrace)
// @ts-ignore
expectType<(name: string) => any>(microAgent.setCurrentRouteName)
// @ts-ignore
expectType<() => InteractionInstance>(microAgent.interaction)

// Base Agent APIs
expectType<(name: string, attributes?: object | undefined) => any>(microAgent.addPageAction)
expectType<(name: string, host?: string | undefined) => any>(microAgent.setPageViewName)
expectType<(name: string, value: string | number | boolean | null, persist?: boolean | undefined) => any>(microAgent.setCustomAttribute)
expectType<(error: Error | string, customAttributes?: object | undefined) => any>(microAgent.noticeError)
expectType<(value: string | null) => any>(microAgent.setUserId)
expectType<(value: string | null) => any>(microAgent.setApplicationVersion)
expectType<(callback: (error: Error | string) => boolean | { group: string; }) => any>(microAgent.setErrorHandler)
expectType<(timeStamp?: number | undefined) => any>(microAgent.finished)
expectType<(name: string, id: string) => any>(microAgent.addRelease)
