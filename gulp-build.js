var fs = require('fs')
var gulp = require('gulp')
var browserify = require('browserify')
var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')
var uglify = require('gulp-uglify')
var file = require('gulp-file')
var sourcemaps = require('gulp-sourcemaps')
var versionify = require('./lib/versionify')
var loaders = require('./loaders')
var preprocessify = require('preprocessify')
var globalRequire = '__nr_require'
var collapser = require('bundle-collapser/plugin')
var cleanDeps = require('./tools/scripts/clean-deps')

module.exports = 'build'

// Exposes some of its own modules using  __nr_require, but doesn't look
// anywhere else for modules it can't find.
var loaderPrelude = fs.readFileSync('prelude.js', 'utf8')

// Looks for modules using global __nr_require if it can't find them in its
// own bundle, but doesn't expose its own modules.
var agentPrelude = fs.readFileSync('agent-prelude.js', 'utf8')

var payloadFeatures = loaders.filter(function (elm) { return elm.name === 'full' })[0].features
var allLoaderNames = []
var allPayloadNames = []
var allPluginNames = []
var loaderExports = ['handle', 'ee', 'id', 'gos', 'wrap-function']

loaders.forEach(function (opt) {
  var name = opt.name + '-loader'
  var minName = name + '.min'
  var aggregator = opt.name + '-aggregator'
  var minAggregator = aggregator + '.min'
  allLoaderNames.push(name, minName)
  gulp.task(name, loader(opt.name, opt.features, false, opt.payload))
  gulp.task(minName, loader(opt.name, opt.features, true, opt.payload))
  if (!opt.payload) return
  gulp.task(aggregator, payload(false, opt.features, opt.name))
  gulp.task(minAggregator, payload(true, opt.features, opt.name))
  allPayloadNames.push(aggregator, minAggregator)
})

gulp.task('nr', payload(false, payloadFeatures))
gulp.task('nr.min', payload(true, payloadFeatures))
allPayloadNames.push('nr', 'nr.min')

// create plugin tasks
fs.readdirSync('plugins')
  .map(function(filename) {
    return filename.substring(0, filename.lastIndexOf('.'))
  })
  .forEach(function(pluginName) {
    gulp.task(pluginName, plugin(pluginName, false))
    gulp.task(pluginName + '.min', plugin(pluginName, true))
    allPluginNames.push(pluginName, pluginName + '.min')
  })

gulp.task('loader', gulp.parallel(allLoaderNames))
gulp.task('payload', gulp.parallel(allPayloadNames))
gulp.task('plugin', gulp.parallel(allPluginNames))
gulp.task('sizes', measureSizes)
gulp.task('build', gulp.series(gulp.parallel('loader', 'payload', 'plugin'), 'sizes'))

function measureSizes () {
  var artifacts = ['nr-loader-spa.min.js', 'nr-loader-full.min.js', 'nr-loader-rum.min.js', 'nr.min.js']
  var sizes = artifacts.map(function (artifact) {
    return fs.statSync('build/' + artifact).size / 1024.0
  })
  var csv = artifacts.join(',') + '\n' + sizes.join(',')
  return file('artifact-sizes.csv', csv, {src: true})
    .pipe(gulp.dest('./build/'))
}

function loader (name, features, min, payloadName) {
  return function () {
    var filename = 'nr-loader-' + name + (min ? '.min' : '') + '.js'
    var bundler = browserify({
      externalRequireName: 'window.NREUM || (NREUM={});' + globalRequire,
      prelude: loaderPrelude,
      transform: [preprocessify(), versionify(min, payloadName)],
      plugin: [collapser, cleanDeps],
      debug: true
    })

    bundler.require('loader', {entry: true, expose: 'loader'})
    loaderExports.forEach(function (name) { bundler.require(name) })
    features.forEach(function (feature) { bundler.add('./feature/' + feature + '/instrument/index.js') })

    var bundleStream = bundler.bundle()
      .pipe(source(filename))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))

    if (min) {
      bundleStream = bundleStream.pipe(uglify({
        mangle: {except: ['UncaughtException', 'nrWrapper']}
      }))
    }

    return bundleStream
      .pipe(sourcemaps.write('./', {addComment: false}))
      .pipe(gulp.dest('./build/'))
  }
}

function payload (min, features, type) {
  return function () {
    var filename = 'nr' + (type ? '-' + type : '') + (min ? '.min' : '') + '.js'
    var bundler = browserify({
      externalRequireName: 'window.NREUM || (NREUM={});' + globalRequire,
      prelude: agentPrelude,
      transform: [preprocessify(), versionify(min)],
      plugin: [collapser, cleanDeps],
      debug: true
    })

    features
      .map(function (feature) { return './feature/' + feature + '/aggregate/index.js' })
      .forEach(function (item) { bundler.add(item) })

    bundler.add('./agent/index.js', { entry: true })

    bundler.external('loader')
    loaderExports.forEach(function (module) {
      bundler.external(module)
    })

    if (!min) bundler.transform('./lib/licenseify')

    var bundleStream = bundler.bundle()
      .pipe(source(filename))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))

    if (min) {
      bundleStream = bundleStream.pipe(uglify({
        mangle: {except: ['UncaughtException', 'nrWrapper']}
      }))
    }

    return bundleStream
      .pipe(sourcemaps.write('./', {addComment: false}))
      .pipe(gulp.dest('./build/'))
  }
}

function plugin (name, min) {
  return function () {
    var filename = 'nr-plugin-' + name + (min ? '.min' : '') + '.js'
    var bundler = browserify({
      externalRequireName: 'window.NREUM || (NREUM={});' + globalRequire,
      prelude: agentPrelude,
      transform: [preprocessify(), versionify(min)],
      plugin: [collapser, cleanDeps],
      debug: true
    })

    bundler.add('./plugins/' + name + '.js', { entry: true })
    loaderExports.forEach(function (module) {
      bundler.external(module)
    })

    var bundleStream = bundler.bundle()
      .pipe(source(filename))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))

    if (min) {
      bundleStream = bundleStream.pipe(uglify({
        mangle: {except: ['UncaughtException', 'nrWrapper']}
      }))
    }

    return bundleStream
      .pipe(sourcemaps.write('./', {addComment: false}))
      .pipe(gulp.dest('./build/'))
  }
}
