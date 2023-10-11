import { parseGQL, parseBatchGQL } from './gql'

const sampleGQLQuery = {
  operationName: 'GetLocations1',
  query: `query GetLocations1 {
    locations {
      id
      name
      description
      __typename
    }
  }`
}

const sampleGQLMutation = {
  operationName: 'SetLocations1',
  query: `mutation SetLocations1($l Location!) {
      setlocations(location: $l) {
        id
        name
        description
        __typename
      }
    }`
}

const sampleGQLQueryAnonymous = {
  query: `query {
        locations {
          id
          name
          description
          __typename
        }
      }`
}

const invalidGQLQueryType = {
  query: `invalidtype ValidName {
        locations {
          id
          name
          description
          __typename
        }
      }`
}

const invalidGQLQueryName = {
  query: `query invalidName! {
        locations {
          id
          name
          description
          __typename
        }
      }`
}

const invalidGQLQueryNoType = {
  query: `{
        locations {
          id
          name
          description
          __typename
        }
      }`
}

describe('gql.js', () => {
  describe('parseGQL', () => {
    test('Accepts only GQL formatted data', () => {
    // invalid inputs
      expect(parseGQL(undefined)).toBeUndefined()
      expect(parseGQL(1)).toBeUndefined()
      expect(parseGQL('test')).toBeUndefined()
      expect(parseGQL(['invalid array'])).toBeUndefined()
      expect(parseGQL({ invalidObject: true })).toBeUndefined()
      expect(parseGQL(JSON.stringify({ invalidObject: true }))).toBeUndefined()
      expect(parseGQL(true)).toBeUndefined()
      expect(parseGQL([sampleGQLQuery])).toBeUndefined() // expects a single object
      expect(parseGQL(invalidGQLQueryType)).toBeUndefined() // will fail if type is invalid
      expect(parseGQL(invalidGQLQueryNoType)).toBeUndefined() // will fail if type is invalid
      // valid objects
      expect(parseGQL(sampleGQLQuery)).not.toBeUndefined()
      expect(parseGQL(sampleGQLQueryAnonymous)).not.toBeUndefined()
      expect(parseGQL(sampleGQLMutation)).not.toBeUndefined()
      expect(parseGQL(invalidGQLQueryName)).not.toBeUndefined()
      // valid json string
      expect(parseGQL(JSON.stringify(sampleGQLQuery))).not.toBeUndefined()
    })

    test('Returns meta correctly', () => {
      const querymeta = parseGQL(sampleGQLQuery)
      expect(querymeta.operationName).toEqual(sampleGQLQuery.operationName)
      expect(querymeta.operationType).toEqual('query')
      expect(querymeta.operationFramework).toEqual('GraphQL')

      const anonmeta = parseGQL(sampleGQLQueryAnonymous)
      expect(anonmeta.operationName).toEqual('Anonymous')
      expect(anonmeta.operationType).toEqual('query')
      expect(anonmeta.operationFramework).toEqual('GraphQL')

      const mutationmeta = parseGQL(sampleGQLMutation)
      expect(mutationmeta.operationName).toEqual(sampleGQLMutation.operationName)
      expect(mutationmeta.operationType).toEqual('mutation')
      expect(mutationmeta.operationFramework).toEqual('GraphQL')

      const invalidtypemeta = parseGQL(invalidGQLQueryType)
      expect(invalidtypemeta).toBeUndefined()

      const invalidnotypemeta = parseGQL(invalidGQLQueryNoType)
      expect(invalidnotypemeta).toBeUndefined()

      const invalidnamemeta = parseGQL(invalidGQLQueryName)
      expect(invalidnamemeta.operationName).toEqual('invalidName')
      expect(invalidnamemeta.operationType).toEqual('query')
      expect(invalidnamemeta.operationFramework).toEqual('GraphQL')
    })
  })

  describe('parseBatchGQL', () => {
    test('Accepts only GQL formatted data', () => {
    // invalid inputs
      expect(parseBatchGQL(undefined)).toBeUndefined()
      expect(parseBatchGQL(1)).toBeUndefined()
      expect(parseBatchGQL('test')).toBeUndefined()
      expect(parseBatchGQL(['invalid array'])).toBeUndefined()
      expect(parseBatchGQL({ invalidObject: true })).toBeUndefined()
      expect(parseBatchGQL(JSON.stringify({ invalidObject: true }))).toBeUndefined()
      expect(parseBatchGQL(true)).toBeUndefined()

      //   // valid objects
      expect(parseBatchGQL(sampleGQLQuery)).not.toBeUndefined()
      expect(parseBatchGQL(sampleGQLQueryAnonymous)).not.toBeUndefined()
      expect(parseBatchGQL(sampleGQLMutation)).not.toBeUndefined()
      expect(parseBatchGQL([sampleGQLQuery, sampleGQLQueryAnonymous, sampleGQLMutation])).not.toBeUndefined() // expects a single object
      //   // valid json string
      expect(parseBatchGQL(JSON.stringify([sampleGQLQuery, sampleGQLQueryAnonymous, sampleGQLMutation]))).not.toBeUndefined() // expects a single object
    })

    test('Returns meta correctly', () => {
      const querymeta = parseBatchGQL(sampleGQLQuery)
      expect(querymeta.operationName).toEqual(sampleGQLQuery.operationName)
      expect(querymeta.operationType).toEqual('query')
      expect(querymeta.operationFramework).toEqual('GraphQL')

      const anonmeta = parseBatchGQL(sampleGQLQueryAnonymous)
      expect(anonmeta.operationName).toEqual('Anonymous')
      expect(anonmeta.operationType).toEqual('query')
      expect(anonmeta.operationFramework).toEqual('GraphQL')

      const mutationmeta = parseBatchGQL(sampleGQLMutation)
      expect(mutationmeta.operationName).toEqual(sampleGQLMutation.operationName)
      expect(mutationmeta.operationType).toEqual('mutation')
      expect(mutationmeta.operationFramework).toEqual('GraphQL')

      const batchmeta = parseBatchGQL([sampleGQLQuery, sampleGQLQueryAnonymous, sampleGQLMutation])
      expect(batchmeta.operationName).toEqual('GetLocations1,Anonymous,SetLocations1')
      expect(batchmeta.operationType).toEqual('query,query,mutation')
      expect(batchmeta.operationFramework).toEqual('GraphQL')

      const batchmixedmeta = parseBatchGQL([sampleGQLQuery, invalidGQLQueryType, invalidGQLQueryNoType, invalidGQLQueryName, sampleGQLMutation])
      expect(batchmixedmeta.operationName).toEqual('GetLocations1,invalidName,SetLocations1') // omits the invalid types, corrects the invalid name (doesnt include !)
      expect(batchmixedmeta.operationType).toEqual('query,query,mutation')
      expect(batchmixedmeta.operationFramework).toEqual('GraphQL')
    })
  })
})
