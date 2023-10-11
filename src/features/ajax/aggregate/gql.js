/**
 * @typedef {object} GQLMetadata
 * @property {string} operationName Name of the operation
 * @property {string} operationType Type of the operation
 * @property {string} operationFramework Framework responsible for the operation
 */

/**
 * @param {string|Object} gql The GraphQL object body sent to a GQL server
 * @returns {GQLMetadata}
 */
export function parseGQL (gql) {
  const contents = parseGQLContents(gql)
  if (typeof contents !== 'object' || !contents.query || typeof contents.query !== 'string') return

  /** parses gql query string and returns [fullmatch, type match, name match] */
  const matches = contents.query.trim().match(/^(query|mutation|subscription)\s?(\w*)/)
  const operationType = matches?.[1]
  if (!operationType) return
  const operationName = contents.operationName || matches?.[2] || 'Anonymous'
  return {
    operationName, // the operation name of the indiv query
    operationType, // query, mutation, or subscription,
    operationFramework: 'GraphQL'
  }
}

export function parseBatchGQL (arrayOfGql) {
  let contents = parseGQLContents(arrayOfGql)
  if (!contents) return
  if (!Array.isArray(contents)) contents = [contents]

  const opNames = []
  const opTypes = []
  for (let content of contents) {
    const operation = parseGQL(content)
    if (!operation) continue

    opNames.push(operation.operationName)
    opTypes.push(operation.operationType)
  }

  if (!opTypes.length) return
  return {
    operationName: opNames.join(','), // the operation name of the indiv query -- joined by ',' for batched results
    operationType: opTypes.join(','), // query, mutation, or subscription -- joined by ',' for batched results
    operationFramework: 'GraphQL'
  }
}

export function parseGQLContents (gqlContents) {
  let contents
  if (typeof gqlContents !== 'string' && typeof gqlContents !== 'object') return
  else if (typeof gqlContents === 'string') {
    try {
      contents = JSON.parse(gqlContents)
    } catch {
      // must be a JSON object
      return
    }
  } else contents = gqlContents
  return contents
}
