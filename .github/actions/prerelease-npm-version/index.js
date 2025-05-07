import { exec, execSync } from 'child_process'
import { args } from './args.js'
import semver from 'semver'


fetch('https://registry.npmjs.com/@newrelic/browser-agent/rc')
.then((response) => response.json())
.then((data) => {

  const bumpedVersion = execSync(`npm version prerelease --preid=${args.preid}`).toString().trim()


  console.log("NPM VERSION", data.version)

    console.log("BUMPED VERSION", bumpedVersion)
    const matcher = /.*-rc\.[0-9]+$/

    console.log("NPM > current version?", semver.gt(data.version, args.currentVersion))

    console.log(args.currentVersion.match(matcher))

    if (args.currentVersion.match(matcher)) {
        // current version has a pre-release identifier -- bump that pre-release identifier
        execSync(`npm version prerelease --preid=${args.preid}`)
    } else {

    }
    // execSync()
})
.catch((error) => {
  console.error('Error fetching data:', error);
})

function handleVersion(newVersion){
    if (args.currentVersion.match(matcher)) {
        // current version has a pre-release identifier -- bump that pre-release identifier
        execSync(`npm version prerelease --preid=${args.preid}`)
    } else {

    }
}