const { execSync } = require('child_process')
const { writeFileSync } = require('fs')
const semver = require('semver')
const core = require('@actions/core')

const lineBreak = () => {
  console.log('----------------------------------')
}

import('./args.js').then(({ args }) => {
  const preid = args.preid || 'rc'

  fetch(`https://registry.npmjs.com/@newrelic/browser-agent/${preid}`)
    .then((response) => response.json())
    .then((data) => {

      const versionJson = require(process.cwd() + '/package.json')

      const npmVersion = data.version ? `${semver.major(data.version)}.${semver.minor(data.version)}.${semver.patch(data.version)}` : `0.0.0`
      const [_, npmPreid] = data.version && !!semver.prerelease(data.version) ? semver.prerelease(data.version) : [undefined, -1]
      
      lineBreak()
      console.log('NPM Version', npmVersion, npmPreid)

      const pkgSrc = args.versionOverride || versionJson.version
      const pkgVersion = pkgSrc ? `${semver.major(pkgSrc)}.${semver.minor(pkgSrc)}.${semver.patch(pkgSrc)}` : `0.0.0`
      let [pkgPreidTag, pkgPreid] = pkgSrc && !!semver.prerelease(pkgSrc) ? semver.prerelease(pkgSrc) : [undefined, -1]
      if (pkgPreidTag !== preid) pkgPreid = -1

      lineBreak()
      console.log('Package Version', pkgVersion, pkgPreid)

      if (semver.gte(npmVersion, pkgVersion)) {
        lineBreak()
        console.log(`NPM Version is greater than or the same, setting local pkg version to NPM version (${preid}) + 1`)
        versionJson.version = npmVersion + `-${preid}.` + (Math.max(parseInt(npmPreid), parseInt(pkgPreid)) + 1)

      } else {
        lineBreak()
        console.log('NPM Version is less than local pkg version, incrementing local pkg version')
        versionJson.version = pkgVersion + `-${preid}.` + (parseInt(pkgPreid) + 1)
      }

      writeFileSync(process.cwd() + '/package.json', JSON.stringify(versionJson, undefined, 2))

      core.setOutput('results', versionJson.version)
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    })
})
