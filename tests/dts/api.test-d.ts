import { BrowserAgent } from '../../dist/types/loaders/browser-agent'
import { MicroAgent } from '../../dist/types/loaders/micro-agent'
import { InteractionInstance } from '../../dist/types/loaders/api/interaction-types'
import { expectType, expectNotType } from 'tsd'

// Browser Agent APIs
const browserAgent = new BrowserAgent({})
expectType<BrowserAgent>(browserAgent)
expectType<(customAttributes: {
  name: string;
  start: number;
  end?: number;
  origin?: string;
  type?: string;
}) => void>(browserAgent.addToTrace)
expectType<(name: string) => void>(browserAgent.setCurrentRouteName)
expectType<() => InteractionInstance>(browserAgent.interaction)

// Base Agent APIs
expectType<(name: string, attributes?: object | undefined) => void>(browserAgent.addPageAction)
expectType<(name: string, host?: string | undefined) => void>(browserAgent.setPageViewName)
expectType<(name: string, value: string | number | null, persist?: boolean | undefined) => void>(browserAgent.setCustomAttribute)
expectType<(error: Error | string, customAttributes?: object | undefined) => void>(browserAgent.noticeError)
expectType<(value: string | null) => void>(browserAgent.setUserId)
expectType<(value: string | null) => void>(browserAgent.setApplicationVersion)
expectType<(callback: (error: Error | string) => boolean | { group: string; }) => void>(browserAgent.setErrorHandler)
expectType<(timeStamp?: number | undefined) => void>(browserAgent.finished)
expectType<(name: string, id: string) => void>(browserAgent.addRelease)

// SPA APIs
expectType<() => InteractionInstance>(browserAgent.interaction)
expectType<(value: string) => InteractionInstance>(browserAgent.interaction().actionText)
expectType<(name: string, callback?: ((...args: any[]) => any) | undefined) => (...args: any) => any>(browserAgent.interaction().createTracer)
expectType<() => InteractionInstance>(browserAgent.interaction().end)
expectType<(callback: (ctx: object) => void) => InteractionInstance>(browserAgent.interaction().getContext)
expectType<() => InteractionInstance>(browserAgent.interaction().ignore)
expectType<(callback: (ctx: object) => void) => InteractionInstance>(browserAgent.interaction().onEnd)
expectType<(key: string, value: any) => InteractionInstance>(browserAgent.interaction().setAttribute)
expectType<(name: string, trigger?: string | undefined) => InteractionInstance>(browserAgent.interaction().setName)

// Micro Agent APIs
const microAgent = new MicroAgent({})
expectNotType<(customAttributes: {
  name: string;
  start: number;
  end?: number;
  origin?: string;
  type?: string;
  // @ts-ignore
}) => void>(microAgent.addToTrace)
// @ts-ignore
expectNotType<(name: string) => void>(microAgent.setCurrentRouteName)
// @ts-ignore
expectNotType<() => InteractionInstance>(microAgent.interaction)

// Base Agent APIs
expectType<(name: string, attributes?: object | undefined) => void>(microAgent.addPageAction)
expectType<(name: string, host?: string | undefined) => void>(microAgent.setPageViewName)
expectType<(name: string, value: string | number | null, persist?: boolean | undefined) => void>(microAgent.setCustomAttribute)
expectType<(error: Error | string, customAttributes?: object | undefined) => void>(microAgent.noticeError)
expectType<(value: string | null) => void>(microAgent.setUserId)
expectType<(value: string | null) => void>(microAgent.setApplicationVersion)
expectType<(callback: (error: Error | string) => boolean | { group: string; }) => void>(microAgent.setErrorHandler)
expectType<(timeStamp?: number | undefined) => void>(microAgent.finished)
expectType<(name: string, id: string) => void>(microAgent.addRelease)
