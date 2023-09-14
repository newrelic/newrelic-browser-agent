#!/usr/bin/env node

process.on('unhandledRejection', (error, p) => {
  console.error(error)
})

import('../runner.mjs')
