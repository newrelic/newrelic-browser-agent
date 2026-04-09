import { gql, GraphQLClient } from 'graphql-request'
import { args } from './args.js'

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
    
    console.log('Creating change tracking event via NerdGraph...')
    console.log(`  Category: ${args.category}`)
    console.log(`  Type: ${args.type}`)
    console.log(`  Entity GUID: ${args.entityGuid}`)
    console.log(`  Application: ${args.application}`)
    console.log(`  API Endpoint: ${apiEndpoint}`)
    
    if (args.category === 'Deployment') {
      console.log(`  Version: ${args.version}`)
    } else if (args.category === 'Feature Flag') {
      console.log(`  Feature Flag ID: ${args.featureFlagId}`)
    }
    
    // Convert category and type to GraphQL format
    const categoryGql = categoryToEnum(args.category)
    const typeGql = typeToPascalCase(args.type)
    
    // Build category fields
    const categoryFields = buildCategoryFields(args.category, args)
    
    // Build optional fields
    const optionalFields = buildOptionalFields(args)
    
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
        query: `id = '${args.entityGuid}'`,
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
        'API-Key': args.apiKey,
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

