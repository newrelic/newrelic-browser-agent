const core = require('@actions/core');
const { gql, GraphQLClient } = require('graphql-request');

/**
 * Convert category to GraphQL enum format (e.g., "Feature Flag" -> "FEATURE_FLAG")
 */
function categoryToEnum(category) {
  return category.toUpperCase().replace(/ /g, '_');
}

/**
 * Convert type to PascalCase (e.g., "Blue Green" -> "BlueGreen")
 */
function typeToPascalCase(type) {
  return type.replace(/\b\w/g, char => char.toUpperCase()).replace(/ /g, '');
}

/**
 * Build the category-specific fields based on category
 */
function buildCategoryFields(category, inputs) {
  if (category === 'Deployment') {
    const deployment = { version: inputs.VERSION };
    
    if (inputs.CHANGELOG) {
      deployment.changelog = inputs.CHANGELOG;
    }
    if (inputs.COMMIT) {
      deployment.commit = inputs.COMMIT;
    }
    if (inputs.DEEP_LINK) {
      deployment.deepLink = inputs.DEEP_LINK;
    }
    
    return { deployment };
  } else if (category === 'Feature Flag') {
    return { 
      featureFlag: { 
        featureFlagId: inputs.FEATURE_FLAG_ID 
      } 
    };
  }
  
  return null;
}

/**
 * Build optional fields
 */
function buildOptionalFields(inputs) {
  const optional = {};
  
  if (inputs.USER) {
    optional.user = inputs.USER;
  }
  if (inputs.DESCRIPTION) {
    optional.description = inputs.DESCRIPTION;
  }
  if (inputs.SHORT_DESCRIPTION) {
    optional.shortDescription = inputs.SHORT_DESCRIPTION;
  }
  if (inputs.GROUP_ID) {
    optional.groupId = inputs.GROUP_ID;
  }
  
  return optional;
}

/**
 * Create change tracking event
 */
async function createChangeTrackingEvent() {
  try {
    // All NerdGraph API calls go to staging
    const apiEndpoint = 'https://staging-api.newrelic.com/graphql';
    
    // Get inputs from environment variables
    const inputs = {
      ENTITY_GUID: process.env.ENTITY_GUID,
      API_KEY: process.env.API_KEY,
      APPLICATION: process.env.APPLICATION,
      VERSION: process.env.VERSION,
      CATEGORY: process.env.CATEGORY,
      TYPE: process.env.TYPE,
      FEATURE_FLAG_ID: process.env.FEATURE_FLAG_ID,
      DESCRIPTION: process.env.DESCRIPTION,
      CHANGELOG: process.env.CHANGELOG,
      COMMIT: process.env.COMMIT,
      DEEP_LINK: process.env.DEEP_LINK,
      USER: process.env.USER,
      GROUP_ID: process.env.GROUP_ID,
      SHORT_DESCRIPTION: process.env.SHORT_DESCRIPTION,
    };
    
    console.log('Creating change tracking event via NerdGraph...');
    console.log(`  Category: ${inputs.CATEGORY}`);
    console.log(`  Type: ${inputs.TYPE}`);
    console.log(`  Entity GUID: ${inputs.ENTITY_GUID}`);
    console.log(`  Application: ${inputs.APPLICATION}`);
    console.log(`  API Endpoint: ${apiEndpoint}`);
    
    if (inputs.CATEGORY === 'Deployment') {
      console.log(`  Version: ${inputs.VERSION}`);
    } else if (inputs.CATEGORY === 'Feature Flag') {
      console.log(`  Feature Flag ID: ${inputs.FEATURE_FLAG_ID}`);
    }
    
    // Convert category and type to GraphQL format
    const categoryGql = categoryToEnum(inputs.CATEGORY);
    const typeGql = typeToPascalCase(inputs.TYPE);
    
    // Build category fields
    const categoryFields = buildCategoryFields(inputs.CATEGORY, inputs);
    
    // Build optional fields
    const optionalFields = buildOptionalFields(inputs);
    
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
        query: `id = '${inputs.ENTITY_GUID}'`,
      },
      ...optionalFields,
    };
    
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
    `;
    
    // Create GraphQL client
    const client = new GraphQLClient(apiEndpoint, {
      headers: {
        'API-Key': inputs.API_KEY,
      },
    });
    
    // Execute the mutation
    const response = await client.request(mutation, { changeTrackingEvent });
    
    console.log('');
    console.log('Response:');
    console.log(JSON.stringify(response, null, 2));
    
    const trackingId = response.changeTrackingCreateEvent.changeTrackingEvent.changeTrackingId;
    
    if (trackingId) {
      console.log('');
      console.log('✓ Change tracking event created successfully!');
      console.log(`  Tracking ID: ${trackingId}`);
    } else {
      throw new Error('Tracking ID not found in response');
    }
    
  } catch (error) {
    console.error('');
    console.error('Error: Change tracking event creation failed!');
    
    if (error.response) {
      console.error('GraphQL Errors:');
      console.error(JSON.stringify(error.response.errors, null, 2));
      console.error('');
      console.error('Status:', error.response.status);
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

// Run the function
createChangeTrackingEvent();
