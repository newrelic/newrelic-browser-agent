import { expectType, expectError } from 'tsd'
import { RegisteredEntity, RegisterAPIMetadata, RegisterAPIConstructor, RegisterAPI } from '../../dist/types/interfaces/registered-entity'

// Test RegisteredEntity constructor with different parameter combinations
const entityOptsWithNumber: RegisterAPIConstructor = {
  id: 123, name: 'test-entity' 
}

const entityOptsWithString: RegisterAPIConstructor = {
  id: 'app-123', name: 'test-entity' 
}

// Create RegisteredEntity instances
const registeredEntityWithNumber = new RegisteredEntity(entityOptsWithNumber)
const registeredEntityWithString = new RegisteredEntity(entityOptsWithString)

// fits the definition of both the RegisterAPI and RegisteredEntity because RegisteredEntity object assigns from RegisterAPI here
expectType<RegisterAPI>(registeredEntityWithNumber) 
expectType<RegisteredEntity>(registeredEntityWithNumber) 
expectType<RegisterAPI>(registeredEntityWithString) 
expectType<RegisteredEntity>(registeredEntityWithString) 

// Test all registered entity methods for each variant
;[registeredEntityWithNumber, registeredEntityWithString].forEach((registeredEntity) => {
  expectType<(name: string, attributes?: object) => void>(registeredEntity.addPageAction)
  expectType<(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => void>(registeredEntity.log)
  expectType<(error: Error | string, customAttributes?: object) => void>(registeredEntity.noticeError)
  expectType<(eventType: string, attributes?: Object) => void>(registeredEntity.recordCustomEvent)
  expectType<(value: string | null) => void>(registeredEntity.setApplicationVersion)
  expectType<(name: string, value: string | number | boolean | null, persist?: boolean) => void>(registeredEntity.setCustomAttribute)
  expectType<(value: string | null) => void>(registeredEntity.setUserId)
  expectType<RegisterAPIMetadata>(registeredEntity.metadata)
})

// Test error cases for constructor with wrong parameters
expectError(new RegisteredEntity({})) // Missing required id and name
expectError(new RegisteredEntity({ id: 123 })) // Missing required name
expectError(new RegisteredEntity({ name: 'test' })) // Missing required id
expectError(new RegisteredEntity({ id: true, name: 'test' })) // Wrong id type (boolean)
expectError(new RegisteredEntity({ id: 123, name: 456 })) // Wrong name type (number)
expectError(new RegisteredEntity({ id: 123, name: 'test', extraProp: 'invalid' })) // Extra properties