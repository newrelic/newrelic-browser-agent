import { parseGQL, parseBatchGQL, parseGQLContents, parseGQLQueryString } from './gql'

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
  describe('parseGQLContents', () => {
    expect((parseGQLContents(undefined))).toBeUndefined()
    expect((parseGQLContents(1))).toBeUndefined()
    expect((parseGQLContents('test'))).toBeUndefined()
    expect((parseGQLContents(['invalid array']))).toBeUndefined()
    expect((parseGQLContents({ invalidObject: true }))).toBeUndefined()
    expect((parseGQLContents(JSON.stringify({ invalidObject: true })))).toBeUndefined()
    expect((parseGQLContents(true))).toBeUndefined()
    // valid objects (potentially with invalid keys to be detected later)
    expect((parseGQLContents([sampleGQLQuery]))).toMatchObject([{ query: expect.any(String) }]) // expects a single object
    expect((parseGQLContents(invalidGQLQueryType))).toEqual(expect.objectContaining({ query: expect.any(String) })) // will fail if type is invalid
    expect((parseGQLContents(invalidGQLQueryNoType))).toEqual(expect.objectContaining({ query: expect.any(String) })) // will fail if type is invalid
    expect((parseGQLContents(sampleGQLQuery))).toEqual(expect.objectContaining({ query: expect.any(String) }))
    expect((parseGQLContents(sampleGQLQueryAnonymous))).toEqual(expect.objectContaining({ query: expect.any(String) }))
    expect((parseGQLContents(sampleGQLMutation))).toEqual(expect.objectContaining({ query: expect.any(String) }))
    expect((parseGQLContents(invalidGQLQueryName))).toEqual(expect.objectContaining({ query: expect.any(String) }))
    // valid json string
    expect((parseGQLContents(JSON.stringify(sampleGQLQuery)))).toEqual(expect.objectContaining({ query: expect.any(String) }))
  })

  describe('parseGQLQueryString', () => {
    expect((parseGQLQueryString(undefined))).toBeUndefined()
    expect((parseGQLQueryString(1))).toBeUndefined()
    expect((parseGQLQueryString('test'))).toBeUndefined()
    expect((parseGQLQueryString(['invalid array']))).toBeUndefined()
    expect((parseGQLQueryString({ invalidObject: true }))).toBeUndefined()
    expect((parseGQLQueryString(JSON.stringify({ invalidObject: true })))).toBeUndefined()
    expect((parseGQLQueryString(true))).toBeUndefined()
    expect((parseGQLQueryString([sampleGQLQuery]))).toBeUndefined()
    // GQL-like string, but has no type param
    expect((parseGQLQueryString('?operationName=GetBestSellers&variables=%7B%22category%22%3A%22BOOKS%22%7D'))).toBeUndefined()
    // GQL-like string, but has no operation type
    expect((parseGQLQueryString('?query=GetBestSellers%28%24category%3A%20ProductCategory%29%7BbestSellers%28category%3A%20%24category%29%7Btitle%7D%7D&operationName=GetBestSellers&variables=%7B%22category%22%3A%22BOOKS%22%7D'))).toEqual(expect.objectContaining({ query: expect.any(String) }))

    // valid strings
    expect((parseGQLQueryString('?query=query%20GetBestSellers%28%24category%3A%20ProductCategory%29%7BbestSellers%28category%3A%20%24category%29%7Btitle%7D%7D&operationName=GetBestSellers&variables=%7B%22category%22%3A%22BOOKS%22%7D'))).toEqual(expect.objectContaining({ query: expect.any(String) }))
  })

  describe('parseGQL', () => {
    test('Accepts only GQL formatted data', () => {
    // invalid inputs
      expect(parseGQL(parseGQLContents(undefined))).toBeUndefined()
      expect(parseGQL(parseGQLContents(1))).toBeUndefined()
      expect(parseGQL(parseGQLContents('test'))).toBeUndefined()
      expect(parseGQL(parseGQLContents(['invalid array']))).toBeUndefined()
      expect(parseGQL(parseGQLContents({ invalidObject: true }))).toBeUndefined()
      expect(parseGQL(parseGQLContents(JSON.stringify({ invalidObject: true })))).toBeUndefined()
      expect(parseGQL(parseGQLContents(true))).toBeUndefined()
      expect(parseGQL(parseGQLContents([sampleGQLQuery]))).toBeUndefined() // expects a single object
      expect(parseGQL(parseGQLContents(invalidGQLQueryType))).toBeUndefined() // will fail if type is invalid
      expect(parseGQL(parseGQLContents(invalidGQLQueryNoType))).toBeUndefined() // will fail if type is invalid
      // valid objects
      expect(parseGQL(parseGQLContents(sampleGQLQuery))).not.toBeUndefined()
      expect(parseGQL(parseGQLContents(sampleGQLQueryAnonymous))).not.toBeUndefined()
      expect(parseGQL(parseGQLContents(sampleGQLMutation))).not.toBeUndefined()
      expect(parseGQL(parseGQLContents(invalidGQLQueryName))).not.toBeUndefined()
      // valid json string
      expect(parseGQL(parseGQLContents(JSON.stringify(sampleGQLQuery)))).not.toBeUndefined()
    })

    test('Returns meta correctly', () => {
      const querymeta = parseGQL(parseGQLContents(sampleGQLQuery))
      expect(querymeta.operationName).toEqual(sampleGQLQuery.operationName)
      expect(querymeta.operationType).toEqual('query')
      expect(querymeta.operationFramework).toEqual('GraphQL')

      const anonmeta = parseGQL(parseGQLContents(sampleGQLQueryAnonymous))
      expect(anonmeta.operationName).toEqual('Anonymous')
      expect(anonmeta.operationType).toEqual('query')
      expect(anonmeta.operationFramework).toEqual('GraphQL')

      const mutationmeta = parseGQL(parseGQLContents(sampleGQLMutation))
      expect(mutationmeta.operationName).toEqual(sampleGQLMutation.operationName)
      expect(mutationmeta.operationType).toEqual('mutation')
      expect(mutationmeta.operationFramework).toEqual('GraphQL')

      const invalidtypemeta = parseGQL(parseGQLContents(invalidGQLQueryType))
      expect(invalidtypemeta).toBeUndefined()

      const invalidnotypemeta = parseGQL(parseGQLContents(invalidGQLQueryNoType))
      expect(invalidnotypemeta).toBeUndefined()

      const invalidnamemeta = parseGQL(parseGQLContents(invalidGQLQueryName))
      expect(invalidnamemeta.operationName).toEqual('invalidName')
      expect(invalidnamemeta.operationType).toEqual('query')
      expect(invalidnamemeta.operationFramework).toEqual('GraphQL')
    })
  })

  describe('parseBatchGQL', () => {
    test('Accepts only GQL formatted data', () => {
    // invalid inputs
      expect(parseBatchGQL(parseGQLContents(undefined))).toBeUndefined()
      expect(parseBatchGQL(parseGQLContents(1))).toBeUndefined()
      expect(parseBatchGQL(parseGQLContents('test'))).toBeUndefined()
      expect(parseBatchGQL(parseGQLContents(['invalid array']))).toBeUndefined()
      expect(parseBatchGQL(parseGQLContents({ invalidObject: true }))).toBeUndefined()
      expect(parseBatchGQL(parseGQLContents(JSON.stringify({ invalidObject: true })))).toBeUndefined()
      expect(parseBatchGQL(parseGQLContents(true))).toBeUndefined()

      //   // valid objects
      expect(parseBatchGQL(parseGQLContents(sampleGQLQuery))).not.toBeUndefined()
      expect(parseBatchGQL(parseGQLContents(sampleGQLQueryAnonymous))).not.toBeUndefined()
      expect(parseBatchGQL(parseGQLContents(sampleGQLMutation))).not.toBeUndefined()
      expect(parseBatchGQL(parseGQLContents([sampleGQLQuery, sampleGQLQueryAnonymous, sampleGQLMutation]))).not.toBeUndefined() // expects a single object
      //   // valid json string
      expect(parseBatchGQL(parseGQLContents(JSON.stringify([sampleGQLQuery, sampleGQLQueryAnonymous, sampleGQLMutation])))).not.toBeUndefined() // expects a single object
    })

    test('Returns meta correctly', () => {
      const querymeta = parseBatchGQL(parseGQLContents(sampleGQLQuery))
      expect(querymeta.operationName).toEqual(sampleGQLQuery.operationName)
      expect(querymeta.operationType).toEqual('query')
      expect(querymeta.operationFramework).toEqual('GraphQL')

      const anonmeta = parseBatchGQL(parseGQLContents(sampleGQLQueryAnonymous))
      expect(anonmeta.operationName).toEqual('Anonymous')
      expect(anonmeta.operationType).toEqual('query')
      expect(anonmeta.operationFramework).toEqual('GraphQL')

      const mutationmeta = parseBatchGQL(parseGQLContents(sampleGQLMutation))
      expect(mutationmeta.operationName).toEqual(sampleGQLMutation.operationName)
      expect(mutationmeta.operationType).toEqual('mutation')
      expect(mutationmeta.operationFramework).toEqual('GraphQL')

      const batchmeta = parseBatchGQL(parseGQLContents([sampleGQLQuery, sampleGQLQueryAnonymous, sampleGQLMutation]))
      expect(batchmeta.operationName).toEqual('GetLocations1,Anonymous,SetLocations1')
      expect(batchmeta.operationType).toEqual('query,query,mutation')
      expect(batchmeta.operationFramework).toEqual('GraphQL')

      const batchmixedmeta = parseBatchGQL(parseGQLContents([sampleGQLQuery, invalidGQLQueryType, invalidGQLQueryNoType, invalidGQLQueryName, sampleGQLMutation]))
      expect(batchmixedmeta.operationName).toEqual('GetLocations1,invalidName,SetLocations1') // omits the invalid types, corrects the invalid name (doesnt include !)
      expect(batchmixedmeta.operationType).toEqual('query,query,mutation')
      expect(batchmixedmeta.operationFramework).toEqual('GraphQL')
    })
  })
})
