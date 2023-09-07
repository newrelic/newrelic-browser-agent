import process from 'process'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'

const results = await Promise.all(args.assetPath
  .map(assetPath => fetchRetry(`https://${args.service}/${assetPath}`, { retry: 3 })
    .then(response => {
      if (response.status !== 200) {
        console.error(`Invalid response for ${assetPath}: ${response.status}`)
        return {
          assetPath,
          status: 'fail'
        }
      }
      return response.text()
        .then(contents => {
          if (typeof contents !== 'string' || contents.trim().length === 0) {
            console.error(`Invalid contents for ${assetPath}`)
            return {
              assetPath,
              status: 'fail'
            }
          }

          console.log(`Verified asset ${assetPath}`)
          return {
            assetPath,
            status: 'success'
          }
        })
    })
    .catch(error => {
      console.error(error)
      return {
        assetPath,
        status: 'fail'
      }
    })
  )
)

if (results.filter(r => r.status === 'fail').length > 0) {
  process.exit(1)
}
