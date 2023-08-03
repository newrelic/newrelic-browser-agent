import Fastly from 'fastly'
import { args } from './args.js'

const fastly = new Fastly.PurgeApi()
await Promise.all(args.purgePath
  .map(assetPath => {
    console.log(`Purging path ${args.service}/${assetPath}`)
    return fastly.purgeSingleUrl({
      cached_url: `${args.service}/${assetPath}`,
      fastly_soft_purge: 1
    })
  })
)

console.log(`Successfully purged fastly cache for ${args.purgePath.length} entities.`)
