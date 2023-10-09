import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core'

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

new BrowserAgent(opts)

const client = new ApolloClient({
  uri: 'https://flyby-router-demo.herokuapp.com/',
  cache: new InMemoryCache()
})
var locations = ['id', 'name', 'description']
window.sendGQL = function (operationName = 'standalone') {
  client
    .query({
      query: gql`
    query ${operationName} {
      locations {
        ${locations.pop()}
      }
    }
  `
    })
}

window.addEventListener('load', function () { window.sendGQL('initialPageLoad') })
