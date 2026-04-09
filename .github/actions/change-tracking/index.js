import { gql, GraphQLClient } from 'graphql-request'

/**
 * Convert category to GraphQL enum format (e.g., "Feature Flag" -> "FEATURE_FLAG")
 */
function categoryToEnum(category) {
  return category.toUpperCase().replace(/ /g, '_')
}

/**
 * Convert type to PascalCase (e.g., "Blue Green" -> "BlueGreen")
 */
function typeToPascalCase(type) {
  return type.replace(/\b\w/g, char => char.toUpperCase()).replace(/ /g, '')
}

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
 * Build the category-specific fields based on category
 */
function buildCategoryFields(category, inputs) {
  if (category === 'Deployment') {
    const deployment = { version: inputs.version }
    
    if (inputs.changelog) {
      deployment.changelog = inputs.changelog
    }
    if (inputs.commit) {
      deployment.commit = inputs.commit
    }
    if (inputs.deepLink) {
      deployment.deepLink = inputs.deepLink
    }
    
    return { deployment }
  } else if (category === 'Feature Flag') {
    return { 
      featureFlag: { 
        featureFlagId: inputs.featureFlagId 
      } 
    }
  }
  
  return null
}

/**
 * Build optional fields
 */
function buildOptionalFields(inputs) {
  const optional = {}
  
  if (inputs.user) {
    optional.user = inputs.user
  }
  if (inputs.description) {
    optional.description = inputs.description
  }
  if (inputs.shortDescription) {
    optional.shortDescription = inputs.shortDescription
  }
  if (inputs.groupId) {
    optional.groupId = inputs.groupId
  }
  
  return optional
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
    
    // Convert category and type to GraphQL format
    const categoryGql = categoryToEnum(inputs.category)
    const typeGql = typeToPascalCase(inputs.type)
    
    // Build category fields
    const categoryFields = buildCategoryFields(inputs.category, inputs)
    
    // Build optional fields
    const optionalFields = buildOptionalFields(inputs)
    
    // Build the change tracking event input
    const changeTrackingEvent = {
      categoryAndTypeData: {
        ...(categoryFields && { categoryFields }),
        kind: {
          category: categoryGql,
          type: typeGql,
        },
      },
      entitySearch: {
        query: `id = '${inputs.entityGuid}'`,
      },
      ...optionalFields,
    }
    
    // Define the GraphQL mutation
    const mutation = gql`
      mutation CreateChangeTrackingEvent($changeTrackingEvent: ChangeTrackingEventInput!) {
        changeTrackingCreateEvent(changeTrackingEvent: $changeTrackingEvent) {
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
    const response = await client.request(mutation, { changeTrackingEvent })
    
    console.log('')
    console.log('Response:')
    console.log(JSON.stringify(response, null, 2))
    
    const trackingId = response.changeTrackingCreateEvent.changeTrackingEvent.changeTrackingId
    
    if (trackingId) {
      console.log('')
      console.log('✓ Change tracking event created successfully!')
      console.log(`  Tracking ID: ${trackingId}`)
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
      console.error('Status:', error.response.status)
    } else {
      console.error(error.message)
    }
    
    process.exit(1)
  }
}

// Run the function
createChangeTrackingEvent()

