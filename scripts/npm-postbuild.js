const fs = require('fs-extra')
const pkgJSON = require('../package.json')

;(async function () {
  // Copy essential files into the dist directory for package distribution
  ['LICENSE', 'README.md', 'CHANGELOG.md'].forEach((file) => {
    fs.copySync(file, `dist/${file}`)
  })

  // Prepare a minimized package.json for distribution
  const distPackageJson = { ...pkgJSON }

  delete distPackageJson.private // Remove private field, as this is intended for public distribution
  delete distPackageJson.devDependencies // Exclude development dependencies to avoid unnecessary installs
  delete distPackageJson.scripts // Remove scripts as they’re not required for distribution
  delete distPackageJson.files // As its already in dist no need to add files as whole dist is distribution
  delete distPackageJson.config // Exclude build / development specific config

  fs.writeFileSync('dist/package.json', JSON.stringify(distPackageJson, null, 2))
})()
