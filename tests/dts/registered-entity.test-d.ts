import { expectType, expectError } from 'tsd'
import { RegisteredEntity, RegisterAPIMetadata, RegisterAPIConstructor } from '../../dist/types/interfaces/registered-entity'

// Test RegisteredEntity constructor with different parameter combinations
const entityOptsWithNumber: RegisterAPIConstructor = {
  id: 123, name: 'test-entity'
}

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

// Create RegisteredEntity instances
const registeredEntityWithNumber = new RegisteredEntity(entityOptsWithNumber)
const registeredEntityWithString = new RegisteredEntity(entityOptsWithString)
const registeredEntityWithObjectTags = new RegisteredEntity(entityOptsWithObjectTags)
const registeredEntityWithComplexTags = new RegisteredEntity(entityOptsWithComplexTags)

// fits the definition of both the RegisterAPI and RegisteredEntity because RegisteredEntity object assigns from RegisterAPI here
expectType<RegisteredEntity>(registeredEntityWithNumber)
expectType<RegisteredEntity>(registeredEntityWithString)
expectType<RegisteredEntity>(registeredEntityWithObjectTags)
expectType<RegisteredEntity>(registeredEntityWithComplexTags)

// Test all registered entity methods for each variant
;[registeredEntityWithNumber, registeredEntityWithString].forEach((registeredEntity) => {
  expectType<(name: string, attributes?: object) => void>(registeredEntity.addPageAction)
  expectType<(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => void>(registeredEntity.log)
  expectType<(error: Error | string, customAttributes?: object) => void>(registeredEntity.noticeError)
  expectType<(eventType: string, attributes?: Object) => void>(registeredEntity.recordCustomEvent)
  expectType<(value: string | null) => void>(registeredEntity.setApplicationVersion)
  expectType<(name: string, value: string | number | boolean | null, persist?: boolean) => void>(registeredEntity.setCustomAttribute)
  expectType<(name: string, options?: {start: number, end: number, duration: number, customAttributes: object}) => ({start: number, end: number, duration: number, customAttributes: object})>(registeredEntity.measure)
  expectType<(value: string | null, resetSession?: boolean) => void>(registeredEntity.setUserId)
  expectType<RegisterAPIMetadata>(registeredEntity.metadata)
})

// Test metadata.target.tags property exists and has correct type
expectType<{ [x: string]: any; } | undefined>(registeredEntityWithObjectTags.metadata.target.tags)
expectType<{ [x: string]: any; } | undefined>(registeredEntityWithComplexTags.metadata.target.tags)

// Test error cases for constructor with wrong parameters
expectError(new RegisteredEntity({})) // Missing required id and name
expectError(new RegisteredEntity({ id: 123 })) // Missing required name
expectError(new RegisteredEntity({ name: 'test' })) // Missing required id
expectError(new RegisteredEntity({ id: true, name: 'test' })) // Wrong id type (boolean)
expectError(new RegisteredEntity({ id: 123, name: 456 })) // Wrong name type (number)
expectError(new RegisteredEntity({ id: 123, name: 'test', extraProp: 'invalid' })) // Extra properties

// Test error cases for tags with wrong types
expectError<RegisterAPIConstructor>({ id: 123, name: 'test', tags: 'not-an-object' }) // tags must be an object
expectError<RegisterAPIConstructor>({ id: 123, name: 'test', tags: 123 }) // tags must be an object
// Note: Arrays cannot be prevented at compile-time with TypeScript index signatures ({ [key: string]: any })
// because arrays are objects with numeric keys. Runtime validation in register.js handles this case.
