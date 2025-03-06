import { RegisteredEntity } from '../../dist/types/interfaces/registered-entity';
import { BrowserAgent } from '../../dist/types/loaders/browser-agent'
import { MicroAgent } from '../../dist/types/loaders/micro-agent'
import { InteractionInstance, getContext, onEnd } from '../../dist/types/loaders/api/interaction-types'
import { expectType, expectError } from 'tsd'

const validOptions = {
  info: {
    applicationID: '12345',
    licenseKey: 'abcde'
  }
}

// Browser Agent APIs
const browserAgent = new BrowserAgent(validOptions)
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
expectType<(name: string, attributes?: object) => any>(browserAgent.addPageAction)
expectType<(name: string, host?: string) => any>(browserAgent.setPageViewName)
expectType<(name: string, value: string | number | boolean | null, persist?: boolean) => any>(browserAgent.setCustomAttribute)
expectType<(error: Error | string, customAttributes?: object) => any>(browserAgent.noticeError)
expectType<(value: string | null) => any>(browserAgent.setUserId)
expectType<(value: string | null) => any>(browserAgent.setApplicationVersion)
expectType<(callback: (error: Error | string) => boolean | { group: string; }) => any>(browserAgent.setErrorHandler)
expectType<(timeStamp?: number) => any>(browserAgent.finished)
expectType<(name: string, id: string) => any>(browserAgent.addRelease)
expectType<() => any>(browserAgent.start)
expectType<() => any>(browserAgent.recordReplay)
expectType<() => any>(browserAgent.pauseReplay)
expectType<(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => any>(browserAgent.log)
expectType<(parent: object, functionName: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => any>(browserAgent.wrapLogger)

// SPA APIs
expectType<() => InteractionInstance>(browserAgent.interaction)
expectType<(value: string) => InteractionInstance>(browserAgent.interaction().actionText)
expectType<(name: string, callback?: ((...args: any[]) => any)) => (...args: any) => any>(browserAgent.interaction().createTracer)
expectType<() => InteractionInstance>(browserAgent.interaction().end)
expectType<getContext>(browserAgent.interaction().getContext)
expectType<() => InteractionInstance>(browserAgent.interaction().ignore)
expectType<onEnd>(browserAgent.interaction().onEnd)
expectType<(key: string, value: any) => InteractionInstance>(browserAgent.interaction().setAttribute)
expectType<(name: string, trigger?: string) => InteractionInstance>(browserAgent.interaction().setName)

// Micro Agent APIs
const microAgent = new MicroAgent(validOptions)
expectType<(featureNames?: string | string[]) => boolean>(microAgent.start)

expectType<(name: string, attributes?: object) => any>(microAgent.addPageAction)
expectType<(name: string, host?: string) => any>(microAgent.setPageViewName)
expectType<(name: string, value: string | number | boolean | null, persist?: boolean) => any>(microAgent.setCustomAttribute)
expectType<(error: Error | string, customAttributes?: object) => any>(microAgent.noticeError)
expectType<(value: string | null) => any>(microAgent.setUserId)
expectType<(value: string | null) => any>(microAgent.setApplicationVersion)
expectType<(callback: (error: Error | string) => boolean | { group: string; }) => any>(microAgent.setErrorHandler)
expectType<(name: string, id: string) => any>(microAgent.addRelease)
expectType<(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => any>(microAgent.log)

const registeredEntity = new RegisteredEntity({
  // @ts-ignore
  licenseKey: '1234',
  applicationID: '5678'
})
expectType<(name: string, attributes?: object) => void>(registeredEntity.addPageAction)
expectType<(name: string, value: string | number | boolean | null, persist?: boolean) => void>(registeredEntity.setCustomAttribute)
expectType<(error: Error | string, customAttributes?: object) => void>(registeredEntity.noticeError)
expectType<(value: string | null) => void>(registeredEntity.setUserId)
expectType<(value: string | null) => void>(registeredEntity.setApplicationVersion)
expectType<(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => void>(registeredEntity.log)
