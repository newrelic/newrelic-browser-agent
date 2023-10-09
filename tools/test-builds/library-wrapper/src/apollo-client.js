import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core'
// import { BatchHttpLink } from '@apollo/client/link/batch-http'

const opts = {
  info: NREUM.info,
  init: { ...NREUM.init, ajax: { block_internal: true } }
}

new BrowserAgent(opts)

const client = new ApolloClient({
  uri: 'https://flyby-router-demo.herokuapp.com/',
  cache: new InMemoryCache()
})

window.addEventListener('load', () => {
  client
    .query({
      query: gql`
      query GetLocations1 {
        locations {
          id
          name
          description
        }
      }
    `
    })
})
