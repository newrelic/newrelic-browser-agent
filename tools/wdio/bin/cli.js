#!/usr/bin/env node

const newrelic = require('newrelic')

process.on('unhandledRejection', (error, p) => {
  newrelic.noticeError(error)
  console.error(error)
})

import('../runner.mjs')
