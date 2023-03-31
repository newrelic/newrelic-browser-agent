#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Adds the provided input text as a comment to a specified Github pull request, or if an optional tag string is
 * provided, updates an existing comment containing that tag.
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs-extra'
import { Octokit } from 'octokit'

const config = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .number('p')
  .alias('p', 'pull-request')
  .describe('p', 'Numeric ID of the pull request to post a comment to')

  .string('t')
  .alias('t', 'token')
  .describe('t', 'Github authentication token')

  .string('i')
  .alias('i', 'input')
  .describe('i', 'Input file containing the comment contents.')

  .string('tag')
  .describe('tag', 'Tag to place in the comment to support updating of comment')

  .argv

;(async () => {
  const client = new Octokit({
    auth: config.token
  })

  let comment
  // If a tag argument is passed, the script will look for an existing PR comment containing the text of the tag and
  // update that existing comment rather than creating a new one.
  if (config.tag) {
    for await (const { data: comments } of client.paginate.iterator(client.rest.issues.listComments, {
      owner: 'newrelic',
      repo: 'newrelic-browser-agent',
      issue_number: config.pullRequest
    })) {
      comment = comments.find((comment) => comment?.body?.includes(config.tag))
      if (comment) break
    }
  }

  if (comment) {
    await client.rest.issues.updateComment({
      owner: 'newrelic',
      repo: 'newrelic-browser-agent',
      issue_number: config.pullRequest,
      comment_id: comment.id,
      body: (await fs.readFile(config.input)) + `\n${config.tag}`
    })
  } else {
    await client.rest.issues.createComment({
      owner: 'newrelic',
      repo: 'newrelic-browser-agent',
      issue_number: config.pullRequest,
      body: (await fs.readFile(config.input)) + `\n${config.tag}`
    })
  }
})()
