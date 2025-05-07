import { execSync } from 'child_process'
import { args } from './args.js'


fetch('https://registry.npmjs.com/@newrelic/browser-agent/rc')
.then((response) => response.json())
.then((data) => {

    console.log(args.currentVersion)
    const matcher = /.*-rc\.[0-9]+$/

    console.log(args.currentVersion.match(matcher))
    // execSync()
})
.catch((error) => {
  console.error('Error fetching data:', error);
})