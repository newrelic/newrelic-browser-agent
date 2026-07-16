function createRegExpFn (agentType, assetType) {
  if (typeof assetType !== 'string' || assetType.trim() === '') {
    assetType = ''
  } else {
    assetType = `-${assetType}`
  }

  return () => new RegExp(`nr${assetType}-${agentType}.min.js`)
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
  }
}
