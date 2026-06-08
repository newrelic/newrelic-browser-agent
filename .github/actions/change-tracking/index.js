import { gql, GraphQLClient } from 'graphql-request'

/**
 * Get inputs from environment variables
 */
function getInputs() {
  return {
    entityGuid: process.env.ENTITY_GUID,
    apiKey: process.env.API_KEY,
    application: process.env.APPLICATION,
    version: process.env.VERSION,
    category: process.env.CATEGORY || 'Deployment',
    type: process.env.TYPE || 'Basic',
    featureFlagId: process.env.FEATURE_FLAG_ID,
    description: process.env.DESCRIPTION,
    changelog: process.env.CHANGELOG,
    commit: process.env.COMMIT,
    deepLink: process.env.DEEP_LINK,
    user: process.env.USER,
    groupId: process.env.GROUP_ID,
    shortDescription: process.env.SHORT_DESCRIPTION,
  }
}

/**
 * Safely escape and quote a string for GraphQL
 */
function gqlString(str) {
  if (!str) return null
  // Let GraphQL handle the escaping by using JSON.stringify
  return JSON.stringify(str)
}

/**
 * Build the categoryFields GraphQL string based on category
 */
function buildCategoryFieldsGQL(category, inputs) {
  if (category === 'Deployment') {
    const fields = [`version: ${gqlString(inputs.version)}`]
    
    if (inputs.changelog) {
      fields.push(`changelog: ${gqlString(inputs.changelog)}`)
    }
    if (inputs.commit) {
      fields.push(`commit: ${gqlString(inputs.commit)}`)
    }
    if (inputs.deepLink) {
      fields.push(`deepLink: ${gqlString(inputs.deepLink)}`)
    }
    
    return `categoryFields: { deployment: { ${fields.join(', ')} } }`
  } else if (category === 'Feature Flag') {
    return `categoryFields: { featureFlag: { featureFlagId: ${gqlString(inputs.featureFlagId)} } }`
  }
  
  return ''
}

/**
 * Build optional fields GraphQL string
 */
function buildOptionalFieldsGQL(inputs) {
  const fields = []
  
  if (inputs.user) {
    fields.push(`user: ${gqlString(inputs.user)}`)
  }
  if (inputs.description) {
    fields.push(`description: ${gqlString(inputs.description)}`)
  }
  if (inputs.shortDescription) {
    fields.push(`shortDescription: ${gqlString(inputs.shortDescription)}`)
  }
  if (inputs.groupId) {
    fields.push(`groupId: ${gqlString(inputs.groupId)}`)
  }
  
  return fields.join('\n      ')
}

/**
 * Create change tracking event
 */
async function createChangeTrackingEvent() {
  try {
    // All NerdGraph API calls go to staging
    const apiEndpoint = 'https://staging-api.newrelic.com/graphql'
    
    const inputs = getInputs()
    
    console.log('Creating change tracking event via NerdGraph...')
    console.log(`  Category: ${inputs.category}`)
    console.log(`  Type: ${inputs.type}`)
    console.log(`  Entity GUID: ${inputs.entityGuid}`)
    console.log(`  Application: ${inputs.application}`)
    console.log(`  API Endpoint: ${apiEndpoint}`)
    
    if (inputs.category === 'Deployment') {
      console.log(`  Version: ${inputs.version}`)
    } else if (inputs.category === 'Feature Flag') {
      console.log(`  Feature Flag ID: ${inputs.featureFlagId}`)
    }
    
    // Build category fields
    const categoryFieldsGQL = buildCategoryFieldsGQL(inputs.category, inputs)
    
    // Build optional fields
    const optionalFieldsGQL = buildOptionalFieldsGQL(inputs)
    
    // Build the GraphQL mutation inline (matching the documented examples)
    // Note: We use inline values instead of variables to match New Relic's API expectations
    const mutation = gql`
      mutation {
        changeTrackingCreateEvent(
          changeTrackingEvent: {
            categoryAndTypeData: {
              ${categoryFieldsGQL}
              kind: { category: ${gqlString(inputs.category)}, type: ${gqlString(inputs.type)} }
            }
            entitySearch: { query: "id = '${inputs.entityGuid}'" }
            ${optionalFieldsGQL}
          }
        ) {
          changeTrackingEvent {
            changeTrackingId
            timestamp
            category
            type
            user
            shortDescription
            description
            groupId
          }
          messages
        }
      }
    `
    
    // Create GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'API-Key': inputs.apiKey,
      },
    })
    
    // Execute the mutation
    const response = await client.request(mutation)
    
    console.log('')
    console.log('Response:')
    console.log(JSON.stringify(response, null, 2))
    
    const trackingId = response.changeTrackingCreateEvent.changeTrackingEvent.changeTrackingId
    
    if (trackingId) {
      console.log('')
      console.log('✓ Change tracking event created successfully!')
      console.log(`  Tracking ID: ${trackingId}`)
      
      // Display any messages from the API
      const messages = response.changeTrackingCreateEvent.messages
      if (messages && messages.length > 0) {
        console.log('  Messages:', messages)
      }
    } else {
      throw new Error('Tracking ID not found in response')
    }
    
  } catch (error) {
    console.error('')
    console.error('Error: Change tracking event creation failed!')
    
    if (error.response) {
      console.error('GraphQL Errors:')
      console.error(JSON.stringify(error.response.errors, null, 2))
      console.error('')
      if (error.response.status) {
        console.error('HTTP Status:', error.response.status)
      }
    } else {
      console.error(error.message)
      if (error.stack) {
        console.error(error.stack)
      }
    }
    
    process.exit(1)
  }
}

// Run the function
createChangeTrackingEvent()

