import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import { loaderTypes } from '../shared-utils/loaders.js'

const envOptions = {
  url: 'https://staging-api.newrelic.com/v2/js_agent_loaders/create.json',
  headers: {
    'X-Api-Key': args.stageApiKey,
    'Content-Type': 'application/json'
  }
}

for (const loader of loaderTypes) {
  console.log(`Downloading ${loader} dev loader`)
  const loaderContentsRequest = await fetchRetry(`https://js-agent.newrelic.com/dev/nr-loader-spa.min.js?_nocache=${uuidv4()}`, { retry: 3 })

  if (!loaderContentsRequest.ok) {
    throw new Error(`Download for ${loader} dev loader failed`)
  }

  const loaderContents = await loaderContentsRequest.text()

  console.log(`Uploading ${loader} dev loader to NRDB`)
  const uploadRequest = await fetchRetry(envOptions.url, {
    retry: 3,
    method: 'PUT',
    redirect: 'follow',
    headers: envOptions.headers,
    body: JSON.stringify({
      js_agent_loader: {
        version: `nr-loader-${loader}-0.x.x-dev.min.js`,
        loader: loaderContents
      },
      set_current: false
    })
  })

  if (!uploadRequest?.ok) {
    throw new Error(`Upload failed with status code ${uploadRequest?.status}. ${uploadRequest?.statusText}`)
  } else {
    console.log(`Completed upload of ${loader} dev loader`)
  }
}
