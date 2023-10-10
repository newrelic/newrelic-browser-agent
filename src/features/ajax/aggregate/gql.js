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
  if (!contents) return
  if (typeof contents !== 'object' || !contents.query) return

  const operationName = contents.operationName || 'anonymous'
  const operationType = contents.query.split(' ')[0]
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
