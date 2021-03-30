#!/usr/bin/env node
var path = module.require('path')
var require = module.require('es6-require')(module, null, path.resolve(__dirname, '../../..'))

require('../runner')
