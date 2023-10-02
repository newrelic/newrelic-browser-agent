function createRegExpFn (agentType, assetType) {
  if (typeof assetType !== 'string' || assetType.trim() === '') {
    assetType = ''
  } else {
    assetType = `-${assetType}`
  }

  return (version) => {
    if (typeof version !== 'string' || version.trim() === '') {
      return new RegExp(`nr${assetType}-${agentType}.min.js`)
    } else {
      return new RegExp(`nr${assetType}-${agentType}(?:\\.[\\w\\d]{8})?-${version}.min.js`)
    }
  }
}

export const reportSettings = {
  lite: {
    statsFileNameTemplate: 'nr-rum-standard{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameRegex: createRegExpFn('rum', 'loader')  },
      { name: 'async-chunk', fileNameRegex: createRegExpFn('rum') }
    ]
  },
  pro: {
    statsFileNameTemplate: 'nr-full-standard{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameRegex: createRegExpFn('full', 'loader') },
      { name: 'async-chunk', fileNameRegex: createRegExpFn('full') }
    ]
  },
  spa: {
    statsFileNameTemplate: 'nr-spa-standard{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameRegex: createRegExpFn('spa', 'loader') },
      { name: 'async-chunk', fileNameRegex: createRegExpFn('spa') }
    ]
  },
  'lite-polyfills': {
    statsFileNameTemplate: 'nr-rum-polyfills{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameRegex: createRegExpFn('rum-polyfills', 'loader') },
      { name: 'async-chunk', fileNameRegex: createRegExpFn('rum-polyfills') }
    ]
  },
  'pro-polyfills': {
    statsFileNameTemplate: 'nr-full-polyfills{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameRegex: createRegExpFn('full-polyfills', 'loader') },
      { name: 'async-chunk', fileNameRegex: createRegExpFn('full-polyfills') }
    ]
  },
  'spa-polyfills': {
    statsFileNameTemplate: 'nr-spa-polyfills{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameRegex: createRegExpFn('spa-polyfills', 'loader') },
      { name: 'async-chunk', fileNameRegex: createRegExpFn('spa-polyfills') }
    ]
  },
  worker: {
    statsFileNameTemplate: 'nr-worker{{version}}.stats.json',
    assetFileNameTemplates: [
      { name: 'loader', fileNameRegex: createRegExpFn('worker', 'loader') },
      { name: 'async-chunk', fileNameRegex: createRegExpFn('worker') }
    ]
  }
}
