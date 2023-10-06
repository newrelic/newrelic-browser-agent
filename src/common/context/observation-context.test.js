import { faker } from '@faker-js/faker'
import { ObservationContext } from './observation-context'
import * as NREUMModule from '../window/nreum'

jest.enableAutomock()
jest.unmock('./observation-context')

let agentIdentifier
let observationContext
beforeEach(() => {
  agentIdentifier = faker.datatype.uuid()
  observationContext = new ObservationContext()

  jest.spyOn(NREUMModule, 'gosNREUM').mockReturnValue({
    initializedAgents: {
      [agentIdentifier]: {
        observationContext
      }
    }
  })
})

test('should return undefined when the observation context instance cannot be found', () => {
  const context = ObservationContext.getObservationContextByAgentIdentifier(faker.datatype.uuid())

  expect(context).toBeUndefined()
})

test('should return the observation context instance when it exists on a found agent', () => {
  const context = ObservationContext.getObservationContextByAgentIdentifier(agentIdentifier)

  expect(context).toEqual(observationContext)
})

test('should return undefined when a context cannot be found', () => {
  const scope = {}

  expect(observationContext.getContext(scope)).toBeUndefined()
})

test('should return the context for the given scope when it exists', () => {
  const scope = {}
  const context = {}

  observationContext.setContext(scope, context)

  expect(observationContext.getContext(scope)).toEqual(context)
})
