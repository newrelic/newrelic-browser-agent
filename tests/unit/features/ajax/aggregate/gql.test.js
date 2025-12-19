import { parseGQL } from '../../../../../src/features/ajax/aggregate/gql'

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

const blobified = new Blob([JSON.stringify(sampleGQLQuery)], { type: 'application/json' })

const GQLLikeStringNoQuery = '?operationName=GetBestSellers&variables=%7B%22category%22%3A%22BOOKS%22%7D'
const GQLLikeStringNoOperationType = '?query=GetBestSellers%28%24category%3A%20ProductCategory%29%7BbestSellers%28category%3A%20%24category%29%7Btitle%7D%7D&operationName=GetBestSellers&variables=%7B%22category%22%3A%22BOOKS%22%7D'
const GQLLikeStringNoOperationName = '?query=query%20GetBestSellers%28%24category%3A%20ProductCategory%29%7BbestSellers%28category%3A%20%24category%29%7Btitle%7D%7D&variables=%7B%22category%22%3A%22BOOKS%22%7D'
const GQLLikeStringAnonymous = '?query=query%28%24category%3A%20ProductCategory%29%7BbestSellers%28category%3A%20%24category%29%7Btitle%7D%7D&variables=%7B%22category%22%3A%22BOOKS%22%7D'
const GQLString = '?query=query%20GetBestSellers%28%24category%3A%20ProductCategory%29%7BbestSellers%28category%3A%20%24category%29%7Btitle%7D%7D&operationName=GetBestSellers&variables=%7B%22category%22%3A%22BOOKS%22%7D'
const GQLStringMutation = '?query=mutation%20GetBestSellers%28%24category%3A%20ProductCategory%29%7BbestSellers%28category%3A%20%24category%29%7Btitle%7D%7D&operationName=GetBestSellers&variables=%7B%22category%22%3A%22BOOKS%22%7D'

function testMetadata (metadata, operationName, operationType) {
  expect(metadata).toMatchObject({
    operationName,
    operationType,
    operationFramework: 'GraphQL'
  })
}

describe('parseGQL', () => {
  // invalid bodies
  test('invalid bodies', () => {
    expect((parseGQL())).toBeUndefined()
    expect((parseGQL({ }))).toBeUndefined()
    expect((parseGQL({ body: undefined }))).toBeUndefined()
    expect((parseGQL({ body: 1 }))).toBeUndefined()
    expect((parseGQL({ body: 'test' }))).toBeUndefined()
    expect((parseGQL({ body: ['invalid array'] }))).toBeUndefined()
    expect((parseGQL({ body: { invalidObject: true } }))).toBeUndefined()
    expect((parseGQL({ body: JSON.stringify({ invalidObject: true }) }))).toBeUndefined()
    expect((parseGQL({ body: true }))).toBeUndefined()
    expect(parseGQL({ body: blobified })).toBeUndefined()
    expect(parseGQL({ body: invalidGQLQueryType })).toBeUndefined()
    expect(parseGQL({ body: invalidGQLQueryNoType })).toBeUndefined()
  })

  // valid bodies
  test('valid bodies', () => {
    testMetadata(parseGQL({ body: sampleGQLQuery }), 'GetLocations1', 'query')
    testMetadata(parseGQL({ body: [sampleGQLQuery] }), 'GetLocations1', 'query')
    testMetadata(parseGQL({ body: sampleGQLQueryAnonymous }), 'Anonymous', 'query')
    testMetadata(parseGQL({ body: [sampleGQLQueryAnonymous] }), 'Anonymous', 'query')
    testMetadata(parseGQL({ body: sampleGQLMutation }), 'SetLocations1', 'mutation')
    testMetadata(parseGQL({ body: [sampleGQLMutation] }), 'SetLocations1', 'mutation')
    testMetadata(parseGQL({ body: invalidGQLQueryName }), 'invalidName', 'query') // cleaned up the !
    testMetadata(parseGQL({ body: [invalidGQLQueryName] }), 'invalidName', 'query') // cleaned up the !
    testMetadata(parseGQL({ body: [sampleGQLQuery, sampleGQLQueryAnonymous, sampleGQLMutation] }), 'GetLocations1,Anonymous,SetLocations1', 'query,query,mutation')
    testMetadata(parseGQL({ body: JSON.stringify(sampleGQLQuery) }), 'GetLocations1', 'query')
    testMetadata(parseGQL({ body: JSON.stringify([sampleGQLQuery]) }), 'GetLocations1', 'query')
  })
  // invalid queries
  test('invalid queries', () => {
    expect((parseGQL({ query: undefined }))).toBeUndefined()
    expect((parseGQL({ query: 1 }))).toBeUndefined()
    expect((parseGQL({ query: 'test' }))).toBeUndefined()
    expect((parseGQL({ query: ['invalid array'] }))).toBeUndefined()
    expect((parseGQL({ query: { invalidObject: true } }))).toBeUndefined()
    expect((parseGQL({ query: JSON.stringify({ invalidObject: true }) }))).toBeUndefined()
    expect((parseGQL({ query: true }))).toBeUndefined()
    expect(parseGQL({ query: blobified })).toBeUndefined()
    expect(parseGQL({ query: invalidGQLQueryType })).toBeUndefined()
    expect(parseGQL({ query: invalidGQLQueryNoType })).toBeUndefined()
    expect(parseGQL({ query: GQLLikeStringNoOperationType })).toBeUndefined()
    expect(parseGQL({ query: GQLLikeStringNoQuery })).toBeUndefined()
  })
  // valid queries
  test('valid queries', () => {
    testMetadata(parseGQL({ query: GQLLikeStringNoOperationName }), 'GetBestSellers', 'query')
    testMetadata(parseGQL({ query: GQLLikeStringAnonymous }), 'Anonymous', 'query')
    testMetadata(parseGQL({ query: GQLString }), 'GetBestSellers', 'query')
    testMetadata(parseGQL({ query: GQLStringMutation }), 'GetBestSellers', 'mutation')
  })

  // precedence
  test('precedence', () => {
    testMetadata(parseGQL({ body: sampleGQLQuery, query: GQLString }), 'GetLocations1', 'query') // body valued over query
    testMetadata(parseGQL({ body: invalidGQLQueryType, query: GQLString }), 'GetBestSellers', 'query') // query valued over body since body is not valid
    testMetadata(parseGQL({ body: undefined, query: GQLString }), 'GetBestSellers', 'query') // query valued over body since body is not valid
  })
})
