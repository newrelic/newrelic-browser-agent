// Reset config values back to released
window.NREUM.loader_config.agentID = '{{{args.appId}}}'
window.NREUM.loader_config.applicationID = '{{{args.appId}}}'
window.NREUM.loader_config.licenseKey = '{{{args.licenseKey}}}'
window.NREUM.info.applicationID = '{{{args.appId}}}'
window.NREUM.info.licenseKey = '{{{args.licenseKey}}}'
window.NREUM.init.proxy = {}
window.NREUM.init.session_replay.enabled = true
window.NREUM.init.session_trace.enabled = true
window.NREUM.init.user_actions = { elementAttributes: ['id', 'className', 'tagName', 'type', 'ariaLabel', 'alt', 'title'] }

// Session replay entitlements check
try {
  var xhr = new XMLHttpRequest()
  xhr.open('POST', '/graphql')
  xhr.setRequestHeader('cache-control', 'no-cache')
  xhr.setRequestHeader('content-type', 'application/json; charset=utf-8')
  xhr.setRequestHeader('newrelic-requesting-services', 'browser-agent')
  xhr.setRequestHeader('pragma', 'no-cache')

  xhr.send(
    JSON.stringify({
      'query': 'query BrowserSessionReplayUserEntitlementsQuery($names: [String]!) { currentUser { id authorizedAccounts { id entitlements(filter: {names: $names}) { name __typename } __typename } __typename } }',
      'variables': {
        'names': [
          'hipaa',
          'fedramp'
        ]
      }
    })
  )

  xhr.addEventListener('load', function (evt) {
    try {
      var entitlementsData = JSON.parse(evt.currentTarget.responseText)
      // call the newrelic api(s) after evaluating entitlements...
      var canRunSr = true
      if (entitlementsData.data && entitlementsData.data.currentUser && entitlementsData.data.currentUser.authorizedAccounts && entitlementsData.data.currentUser.authorizedAccounts.length) {
        for (var i = 0; i < entitlementsData.data.currentUser.authorizedAccounts.length; i++) {
          var ent = entitlementsData.data.currentUser.authorizedAccounts[i]
          if (!ent.entitlements || !ent.entitlements.length) continue
          for (var j = 0; j < ent.entitlements.length; j++) {
            if (ent.entitlements[j].name === 'fedramp' || ent.entitlements[j].name === 'hipaa') canRunSr = false
          }
        }
      }
      if (canRunSr && newrelic && !!newrelic.start) newrelic.start('session_replay')
    } catch (e) {
      // something went wrong...
      if (!!newrelic && !!newrelic.noticeError) newrelic.noticeError(e)
    }
  })
} catch (err) {
  // we failed our mission....
  if (!!newrelic && !!newrelic.noticeError) newrelic.noticeError(err)
}

if (!!newrelic && !!newrelic.log) {
  newrelic.log('NRBA log API - error', { level: 'error' })
  newrelic.log('NRBA log API - trace', { level: 'trace' })
  newrelic.log('NRBA log API - warn', { level: 'warn' })
  newrelic.log('NRBA log API - info', { level: 'info' })
  newrelic.log('NRBA log API - debug', { level: 'debug' })
}

// Browser AI-Hackthon POC Prep
try {
  const automatedHints = ['Headless', 'PhantomJS', 'Selenium', 'WebDriver', 'Puppeteer', 'Playwright']
  const botHints = ['bot', 'spider', 'crawler', 'scraper', 'robot', 'Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot', 'AhrefsBot', 'SemrushBot', 'Exabot', 'facebot', 'ia_archiver', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'Slackbot', 'Discordbot', 'Pinterestbot', 'WhatsApp', 'TelegramBot', 'GoogleAdsBot', 'BingPreview']

  const automatedMatches = []
  const botMatches = []

  if (window.navigator.webdriver) {
    automatedMatches.push('webdriver')
  }

  if (window.outerWidth === 0 || window.outerHeight === 0) {
    automatedMatches.push('invalid window size')
  }

  const userAgentString = window.navigator.userAgent

  if (userAgentString) {
    automatedHints.map(x => x.toLowerCase()).forEach((hint) => {
      if (userAgentString.toLowerCase().includes(hint)) {
        automatedMatches.push(hint);
      }
    })

    botHints.map(x => x.toLowerCase()).forEach((hint) => {
      if (userAgentString.toLowerCase().includes(hint)) {
        botMatches.push(hint);
      }
    })
  }

  if (automatedMatches.length) {
    newrelic.setCustomAttribute("automated", true);
    newrelic.setCustomAttribute('automated-hints', automatedMatches.join(','));
    newrelic.setCustomAttribute('userAgent', window.navigator.userAgent);
  }

  if (botMatches.length) {
    newrelic.setCustomAttribute("bot", true);
    newrelic.setCustomAttribute('bot-hints', botMatches.join(','));
    newrelic.setCustomAttribute('userAgent', window.navigator.userAgent);
  }
} catch (e) {
  newrelic.noticeError(new Error("NRBA: swallowed preamble error", { cause: e }));
}

try {
  // Browser Pressure POC
  if (typeof window.PressureObserver === "function") {
    let lastPressure = ''
    const pressureObserverCallback = (records) => {
      const latestRecord = records[records.length - 1];
      const impact = {
        "nominal": 0,
        "fair": 1,
        "serious": 2,
        "critical": 3
      }
      if (lastPressure === latestRecord.state) return // report once per status change

      lastPressure = latestRecord.state
      newrelic.setCustomAttribute("pressure", latestRecord.state);
      newrelic.setCustomAttribute("pressureImpact", impact[latestRecord.state]);

      newrelic.recordCustomEvent('BrowserPressure', {
        pressure: latestRecord.state,
        pressureImpact: impact[latestRecord.state],
        pageHasLoaded: document.readyState === 'complete',
        originSource: 'cpu',
        deviceCpu: navigator.deviceMemory
      })
    };
    const pressureObserver = new window.PressureObserver(pressureObserverCallback);
    pressureObserver.observe("cpu", { sampleInterval: 1000 });
  }
} catch (e) {
  newrelic.noticeError(new Error("NRBA: swallowed preamble error", { cause: e }));
}

// MFE API Registration Testing
try {
  if (!!newrelic && !!newrelic.register) {
    // Generate random ID between 1-3
    const randomId = Math.floor(Math.random() * 3) + 1;
    const mfeName = `MOCK_MFE_${randomId}`;

    for (let agentIdentifier in newrelic.initializedAgents) {
      const MfeToMfeParent = newrelic.initializedAgents[agentIdentifier].register({
        id: 'mfe-to-mfe-parent',
        name: 'MFE_TEST_PARENT',
      })

      const MfeToMfeChild = MfeToMfeParent.register({
        id: 'mfe-to-mfe-child',
        name: 'MFE_TEST_CHILD',
      })

      const MfeToMfeGrandchild = MfeToMfeChild.register({
        id: 'mfe-to-mfe-grandchild',
        name: 'MFE_TEST_GRANDCHILD',
      })

      const jseOnlyMfe = newrelic.initializedAgents[agentIdentifier].register({
        id: 'jse-only-mfe',
        name: 'JSE_ONLY_MFE',
      })

      jseOnlyMfe.noticeError(new Error('NRBA: This is a test error from JSE_ONLY_MFE'));


      // Register the MFE API
      const mfeApi = newrelic.initializedAgents[agentIdentifier].register({ id: randomId, name: mfeName });
      
      // Generate a random sentence for logging
      const randomSentences = [
        'This is a test log message from the registered MFE',
        'MFE logging functionality is working correctly',
        'Random simulation for testing purposes',
        'Demonstrating registered entity log capabilities',
        'Testing MFE API integration with New Relic',
        'Sample log from micro frontend',
        'Validating registered entity reporting',
        'MFE diagnostic message for debugging',
        'Testing cross-entity logging functionality',
        'Random MFE log event for validation'
      ];
      const randomSentence = randomSentences[Math.floor(Math.random() * randomSentences.length)];
      
      // Call log with error level
      mfeApi.log(randomSentence, { level: 'error' });

      mfeApi.noticeError(new Error(`NRBA: This is a test error from ${mfeName}`));

      MfeToMfeParent.log('This is a test log from MFE_TO_MFE_PARENT', { level: 'error' });
      MfeToMfeChild.log('This is a test log from MFE_TO_MFE_CHILD', { level: 'error' });
      MfeToMfeGrandchild.log('This is a test log from MFE_TO_MFE_GRANDCHILD', { level: 'error' });

      MfeToMfeParent.noticeError(new Error('NRBA: This is a test error from MFE_TO_MFE_PARENT'));
      MfeToMfeChild.noticeError(new Error('NRBA: This is a test error from MFE_TO_MFE_CHILD'));
      MfeToMfeGrandchild.noticeError(new Error('NRBA: This is a test error from MFE_TO_MFE_GRANDCHILD'));
    }
  }
} catch (e) {
  if (!!newrelic && !!newrelic.noticeError) {
    newrelic.noticeError(new Error("NRBA: MFE registration error", { cause: e }));
  }
}
