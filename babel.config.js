const process = require('process')
const pkg = require('./package.json')

module.exports = function (api, ...args) {
  api.cache(true)

  if (!process.env.BUILD_VERSION) {
    process.env.BUILD_VERSION = process.env.VERSION_OVERRIDE || pkg.version
  }
  if (!process.env.BUILD_ENV) {
    process.env.BUILD_ENV = 'CDN'
  }
  if (!process.env.RRWEB_VERSION) {
    // Prefer the installed package's actual version (node_modules/@newrelic/rrweb/package.json)
    // rather than the semver range declared in this repo's package.json.
    try {
      // eslint-disable-next-line n/no-missing-require
      const rrwebPkg = require('@newrelic/rrweb/package.json')
      if (rrwebPkg && rrwebPkg.version) {
        process.env.RRWEB_VERSION = rrwebPkg.version
      } else {
        process.env.RRWEB_VERSION = pkg.dependencies['@newrelic/rrweb'] || '0.0.0'
      }
    } catch (e) {
      // Fallback to the semver declaration if the installed package cannot be resolved yet
      process.env.RRWEB_VERSION = pkg.dependencies['@newrelic/rrweb'] || '0.0.0'
    }
  }

  const ignore = [
    '**/__mocks__/*.js'
  ]
  const presets = [
    '@babel/preset-env'
  ]
  const plugins = [
    // Replaces template literals with concatenated strings. Some customers enclose snippet in backticks when
    // assigning to a variable, which conflicts with template literals.
    '@babel/plugin-transform-template-literals',
    // Replaces `process.env.*` environment variables with actual values.
    [
      'transform-inline-environment-variables',
      {
        include: ['BUILD_VERSION', 'BUILD_ENV', 'RRWEB_VERSION']
      }
    ],
    // Support import `with` attribute for json
    '@babel/plugin-syntax-import-attributes'
  ]
  const env = {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: 'commonjs'
          }
        ]
      ]
    },
    webpack: {
      ignore
    },
    'npm-cjs': {
      ignore,
      presets: [
        [
          '@babel/preset-env', {
            modules: 'commonjs'
          }
        ]
      ],
      plugins: [
        [
          './tools/babel/plugins/transform-import',
          {
            '(/constants/|^\\./)env$': '$1env.npm'
          }
        ]
      ]
    },
    'npm-esm': {
      ignore,
      presets: [
        [
          '@babel/preset-env', {
            modules: false
          }
        ]
      ],
      plugins: [
        [
          './tools/babel/plugins/transform-import',
          {
            '(/constants/|^\\./)env$': '$1env.npm'
          }
        ]
      ]
    }
  }

  return {
    presets,
    plugins,
    env
  }
}
