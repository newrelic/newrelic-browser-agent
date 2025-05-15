/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export function detectAutomation () {
// Browser AI-Hackthon POC Prep

  const matches = []
  let userAgentString

  const hints = [
    ' daum[ /]', ' deusu/', ' yadirectfetcher', '(?:^|[^g])news(?!sapphire)', '(?<! (?:channel/|google/))google(?!(app|/google| pixel))',
    '(?<! cu)bots?(?:\\b|_)', '(?<!(?:lib))http', '(?<![hg]m)score', '(?<!cam)scan', '@[a-z][\\w-]+\\.',
    '\\(\\)', '\\.com\\b', '\\btime/', '\\|', '^<',
    '^[\\w \\.\\-\\(?:\\):%]+(?:/v?\\d+(?:\\.\\d+)?(?:\\.\\d{1,10})*?)?(?:,|$)', '^[^ ]{50,}$', '^\\d+\\b', '^\\w*search\\b', '^\\w+/[\\w\\(\\)]*$',
    '^active', '^ad muncher', '^amaya', '^avsdevicesdk/', '^biglotron',
    '^bot', '^bw/', '^clamav[ /]', '^client/', '^cobweb/',
    '^custom', '^ddg[_-]android', '^discourse', '^dispatch/\\d', '^downcast/',
    '^duckduckgo', '^email', '^facebook', '^getright/', '^gozilla/',
    '^hobbit', '^hotzonu', '^hwcdn/', '^igetter/', '^jeode/',
    '^jetty/', '^jigsaw', '^microsoft bits', '^movabletype', '^mozilla/\\d\\.\\d\\s[\\w\\.-]+$',
    '^mozilla/\\d\\.\\d\\s\\(compatible;?(?:\\s\\w+\\/\\d+\\.\\d+)?\\)$', '^navermailapp', '^netsurf', '^offline', '^openai/',
    '^owler', '^php', '^postman', '^python', '^rank',
    '^read', '^reed', '^rest', '^rss', '^snapchat',
    '^space bison', '^svn', '^swcd ', '^taringa', '^thumbor/',
    '^track', '^w3c', '^webbandit/', '^webcopier', '^wget',
    '^whatsapp', '^wordpress', '^xenu link sleuth', '^yahoo', '^yandex',
    '^zdm/\\d', '^zoom marketplace/', '^{{.*}}$', 'analyzer', 'archive',
    'ask jeeves/teoma', 'audit', 'bit\\.ly/', 'bluecoat drtr', 'browsex',
    'burpcollaborator', 'capture', 'catch', 'check\\b', 'checker',
    'chrome-lighthouse', 'chromeframe', 'classifier', 'cloudflare', 'convertify',
    'crawl', 'cypress/', 'dareboost', 'datanyze', 'dejaclick',
    'detect', 'dmbrowser', 'download', 'evc-batch/', 'exaleadcloudview',
    'feed', 'firephp', 'functionize', 'gomezagent', 'grab',
    'headless', 'httrack', 'hubspot marketing grader', 'hydra', 'ibisbrowser',
    'infrawatch', 'insight', 'inspect', 'iplabel', 'ips-agent',
    'java(?!;)', 'library', 'linkcheck', 'mail\\.ru/', 'manager',
    'measure', 'neustar wpm', 'node', 'nutch', 'offbyone',
    'onetrust', 'optimize', 'pageburst', 'pagespeed', 'parser',
    'perl', 'phantomjs', 'pingdom', 'powermarks', 'preview',
    'proxy', 'ptst[ /]\\d', 'retriever', 'rexx;', 'rigor',
    'rss\\b', 'scrape', 'server', 'sogou', 'sparkler/',
    'speedcurve', 'spider', 'splash', 'statuscake', 'supercleaner',
    'synapse', 'synthetic', 'tools', 'torrent', 'transcoder',
    'url', 'validator', 'virtuoso', 'wappalyzer', 'webglance',
    'webkit2png', 'whatcms/', 'xtate/', 'selenium', 'webdriver',
    'puppeteer', 'playwright', 'crawler', 'scraper', 'robot',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexBot', 'ahrefsBot', 'semrushBot', 'exabot', 'facebot',
    'ia_archiver', 'facebookexternalhit', 'twitterbot', 'linkedInBot', 'slackbot',
    'discordbot', 'pinterestbot', 'whatsApp', 'telegramBot', 'googleAdsBot',
    'bingpreview'
  ]

  try {
    if (window.navigator.webdriver) {
      matches.push('webdriver')
    }

    if (window.outerWidth === 0 || window.outerHeight === 0) {
      matches.push('invalid window size')
    }

    userAgentString = window.navigator.userAgent

    if (userAgentString) {
      hints.forEach((hint) => {
        const match = userAgentString.match(new RegExp(hint, 'i'))
        if (match && match[0]) {
          matches.push(hint)
        }
      })
    }

    return { matches, userAgentString }
  } catch (e) {
    return { matches, userAgentString }
  }
}
