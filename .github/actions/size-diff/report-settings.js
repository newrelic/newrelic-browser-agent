function createRegExpFn (agentType, assetType) {
  if (typeof assetType !== 'string' || assetType.trim() === '') {
    assetType = ''
  } else {
    assetType = `-${assetType}`
  }

  // Prod builds (`cdn:build:prod`) insert a `-<version>` segment into asset
  // filenames (e.g. `nr-loader-full-1.318.0.min.js`); dev builds don't. The
  // optional group below tolerates either, anchored so it can't spill into a
  // sibling bundle's name (e.g. `nr-full-recorder-1.318.0.min.js`).
  return () => new RegExp(`^nr${assetType}-${agentType}(-\\d+\\.\\d+\\.\\d+)?\\.min\\.js$`)
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
