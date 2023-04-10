const process = require('process')

module.exports = function (api) {
  api.cache(true)

  if (!process.env.BUILD_VERSION) {
    process.env.BUILD_VERSION = require('./package.json').version
  }

  const presets = [
    '@babel/preset-env'
  ]
  const plugins = [
    '@babel/plugin-transform-template-literals',
    [
      'transform-inline-environment-variables',
      {
        include: ['BUILD_VERSION', 'BUILD_ENV']
      }
    ]
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
      plugins: [
        [
          './tools/scripts/babel-plugin-transform-import',
          {
            '(constants/)env$': '$1env.cdn'
          }
        ]
      ]
    },
    'webpack-ie11': {
      presets: [
        [
          '@babel/preset-env', {
            useBuiltIns: 'entry',
            corejs: { version: 3.23, proposals: true },
            loose: true,
            targets: {
              browsers: [
                'ie >= 11' // Does not affect webpack's own runtime output; see `target` webpack config property.
              ]
            }
          }
        ]
      ],
      plugins: [
        [
          './tools/scripts/babel-plugin-transform-import',
          {
            '(constants/)env$': '$1env.cdn'
          }
        ]
      ]
    },
    'npm-cjs': {
      presets: [
        [
          '@babel/preset-env', {
            modules: 'commonjs'
          }
        ]
      ],
      plugins: [
        [
          './tools/scripts/babel-plugin-transform-import',
          {
            '(constants/)env$': '$1env.npm'
          }
        ]
      ]
    },
    'npm-esm': {
      presets: [
        [
          '@babel/preset-env', {
            modules: false
          }
        ]
      ],
      plugins: [
        [
          './tools/scripts/babel-plugin-transform-import',
          {
            '(constants/)env$': '$1env.npm'
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
