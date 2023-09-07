export const reportSettings = {
  lite: {
    statsFileNameTemplate: 'nr-rum-standard{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameTemplate: 'nr-loader-rum{{version}}.min.js' },
      { name: 'async-chunk', fileNameTemplate: 'nr-rum{{version}}.min.js' }
    ]
  },
  pro: {
    statsFileNameTemplate: 'nr-full-standard{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameTemplate: 'nr-loader-full{{version}}.min.js' },
      { name: 'async-chunk', fileNameTemplate: 'nr-full{{version}}.min.js' }
    ]
  },
  spa: {
    statsFileNameTemplate: 'nr-spa-standard{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameTemplate: 'nr-loader-spa{{version}}.min.js' },
      { name: 'async-chunk', fileNameTemplate: 'nr-spa{{version}}.min.js' }
    ]
  },
  'lite-polyfills': {
    statsFileNameTemplate: 'nr-rum-polyfills{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameTemplate: 'nr-loader-rum-polyfills{{version}}.min.js' },
      { name: 'async-chunk', fileNameTemplate: 'nr-rum-polyfills{{version}}.min.js' }
    ]
  },
  'pro-polyfills': {
    statsFileNameTemplate: 'nr-full-polyfills{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameTemplate: 'nr-loader-full-polyfills{{version}}.min.js' },
      { name: 'async-chunk', fileNameTemplate: 'nr-full-polyfills{{version}}.min.js' }
    ]
  },
  'spa-polyfills': {
    statsFileNameTemplate: 'nr-spa-polyfills{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameTemplate: 'nr-loader-spa-polyfills{{version}}.min.js' },
      { name: 'async-chunk', fileNameTemplate: 'nr-spa-polyfills{{version}}.min.js' }
    ]
  },
  worker: {
    statsFileNameTemplate: 'nr-worker{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameTemplate: 'nr-loader-worker{{version}}.min.js' },
      { name: 'async-chunk', fileNameTemplate: 'nr-worker{{version}}.min.js' }
    ]
  }
}
