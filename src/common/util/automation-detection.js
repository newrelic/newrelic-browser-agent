/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export function detectAutomation () {
// Browser AI-Hackthon POC Prep

  const automatedMatches = []
  const botMatches = []
  let userAgentString

  try {
    const automatedHints = ['headless', 'phantomJS', 'selenium', 'webdriver', 'puppeteer', 'playwright']
    const botHints = ['bot', 'spider', 'crawler', 'scraper', 'robot', 'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexBot', 'ahrefsBot', 'semrushBot', 'exabot', 'facebot', 'ia_archiver', 'facebookexternalhit', 'twitterbot', 'linkedInBot', 'slackbot', 'discordbot', 'pinterestbot', 'whatsApp', 'telegramBot', 'googleAdsBot', 'bingpreview']

    if (window.navigator.webdriver) {
      automatedMatches.push('webdriver')
    }

    if (window.outerWidth === 0 || window.outerHeight === 0) {
      automatedMatches.push('invalid window size')
    }

    userAgentString = window.navigator.userAgent

    if (userAgentString) {
      automatedHints.forEach((hint) => {
        if (userAgentString.toLowerCase().includes(hint)) {
          automatedMatches.push(hint)
        }
      })

      botHints.forEach((hint) => {
        if (userAgentString.toLowerCase().includes(hint)) {
          botMatches.push(hint)
        }
      })
    }

    return { automatedMatches, botMatches, userAgentString }
  } catch (e) {
    return { automatedMatches, botMatches, userAgentString }
  }
}
