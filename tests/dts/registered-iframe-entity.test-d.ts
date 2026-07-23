import { expectType, expectError } from 'tsd'
import { RegisteredIframeEntity, RegisterAPIMetadata, RegisterAPIConstructor } from '../../dist/types/interfaces/registered-iframe-entity'

// Test RegisteredIframeEntity constructor with different parameter combinations
const entityOptsWithString: RegisterAPIConstructor = {
  id: 'app-123', name: 'test-entity'
}

// Test with object tags
const entityOptsWithObjectTags: RegisterAPIConstructor = {
  id: 'app-789', name: 'test-entity', tags: { environment: 'production', version: '1.0.0' }
}

// Test with complex tags
const entityOptsWithComplexTags: RegisterAPIConstructor = {
  id: 'app-101', name: 'test-entity', tags: { environment: 'staging', critical: true, count: 42 }
}

// Create RegisteredIframeEntity instances
const registeredIframeEntityWithString = new RegisteredIframeEntity(entityOptsWithString)
const registeredIframeEntityWithObjectTags = new RegisteredIframeEntity(entityOptsWithObjectTags)
const registeredIframeEntityWithComplexTags = new RegisteredIframeEntity(entityOptsWithComplexTags)

expectType<RegisteredIframeEntity>(registeredIframeEntityWithString)
expectType<RegisteredIframeEntity>(registeredIframeEntityWithObjectTags)
expectType<RegisteredIframeEntity>(registeredIframeEntityWithComplexTags)

// Test all registered iframe entity methods for each variant
;[registeredIframeEntityWithString, registeredIframeEntityWithObjectTags, registeredIframeEntityWithComplexTags].forEach((registeredIframeEntity) => {
  expectType<(name: string, attributes?: object) => void>(registeredIframeEntity.addPageAction)
  expectType<(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => void>(registeredIframeEntity.log)
  expectType<(error: Error | string, customAttributes?: object) => void>(registeredIframeEntity.noticeError)
  expectType<(eventType: string, attributes?: Object) => void>(registeredIframeEntity.recordCustomEvent)
  expectType<(value: string | null) => void>(registeredIframeEntity.setApplicationVersion)
  expectType<(name: string, value: string | number | boolean | null, persist?: boolean) => void>(registeredIframeEntity.setCustomAttribute)
  // unlike RegisteredEntity, measure resolves asynchronously since it round-trips through postMessage to the parent
  expectType<(name: string, options?: {start?: number|PerformanceMark, end?: number|PerformanceMark, customAttributes?: object}) => Promise<{start: number, end: number, duration: number, customAttributes: object}>>(registeredIframeEntity.measure)
  expectType<(value: string | null, resetSession?: boolean) => void>(registeredIframeEntity.setUserId)
  // unlike RegisteredEntity, deregister resolves asynchronously since it round-trips through postMessage to the parent
  expectType<() => Promise<void>>(registeredIframeEntity.deregister)
  expectType<RegisterAPIMetadata>(registeredIframeEntity.metadata)
})

// Test metadata.target.tags property exists and has correct type
expectType<{ [x: string]: any; } | undefined>(registeredIframeEntityWithObjectTags.metadata.target?.tags)
expectType<{ [x: string]: any; } | undefined>(registeredIframeEntityWithComplexTags.metadata.target?.tags)

// blocked is only ever set when construction fails (not an iframe window) or registration errors out
expectType<boolean | undefined>(registeredIframeEntityWithString.blocked)

// Test error cases for constructor with wrong parameters
expectError(new RegisteredIframeEntity({})) // Missing required id and name
expectError(new RegisteredIframeEntity({ id: 123 })) // Wrong id type (number) and missing required name
expectError(new RegisteredIframeEntity({ name: 'test' })) // Missing required id
expectError(new RegisteredIframeEntity({ id: true, name: 'test' })) // Wrong id type (boolean)
expectError(new RegisteredIframeEntity({ id: 123, name: 456 })) // Wrong id type (number) and wrong name type (number)
expectError(new RegisteredIframeEntity({ id: 123, name: 'test', extraProp: 'invalid' })) // Wrong id type (number) and extra properties

// Test error cases for tags with wrong types
expectError<RegisterAPIConstructor>({ id: '123', name: 'test', tags: 'not-an-object' }) // tags must be an object
expectError<RegisterAPIConstructor>({ id: '123', name: 'test', tags: 123 }) // tags must be an object
// Note: Arrays cannot be prevented at compile-time with TypeScript index signatures ({ [key: string]: any })
// because arrays are objects with numeric keys. Runtime validation in register.js handles this case.
