(function() {
  // ===== EXPERIMENT DETECTION & ROUTING =====
  // Query-param based experiment loading: ?nrbaExperiment={branch-name}
  // Loads config.js (sets window.NREUM) then nr-loader-spa.min.js
  try {

    window.NREUM = window.NREUM || {};
    window.NREUM.loader_config = window.NREUM.loader_config || {};
    window.NREUM.info = window.NREUM.info || {};
    window.NREUM.init = window.NREUM.init || {};

    var urlParams = new URLSearchParams(window.location.search);
    var experiment = urlParams.get('nrbaExperiment');
    
    if (experiment) {
      console.log('NRBA: Loading experiment "' + experiment + '" from query parameter');
      
      var baseUrl = 'https://js-agent.newrelic.com/experiments/dev/' + encodeURIComponent(experiment) + '/';
      
      // Step 1: Load config.js (sets window.NREUM with A/B account)
      var configScript = document.createElement('script');
      configScript.type = 'text/javascript';
      configScript.src = baseUrl + 'config.js';
      configScript.onerror = function() {
        console.warn('NRBA: Failed to load experiment config, falling back to released loader');
      };
      
      // Step 2: After config loads, load the actual agent loader
      configScript.onload = function() {
        console.log('NRBA: Experiment config loaded, loading agent...');
        var loaderScript = document.createElement('script');
        loaderScript.type = 'text/javascript';
        loaderScript.src = baseUrl + 'nr-loader-spa.min.js';
        loaderScript.onerror = function() {
          console.warn('NRBA: Failed to load experiment loader');
        };
        loaderScript.onload = function() {
          console.log('NRBA: Successfully loaded experiment "' + experiment + '"');
        };
        document.head.appendChild(loaderScript);
      };
      
      document.head.appendChild(configScript);
      
      // Short-circuit: Don't execute released loader below
      return;
    }
  } catch (e) {
    // Query param detection failed, fall through to released loader
    console.warn('NRBA: Experiment detection failed, using released loader', e);
  }
  
  // ===== NORMAL RELEASED LOADER =====
  /* Pages served with locally hosted nerdpacks (?nerdpacks=local) are developer sessions. Their console output is
  not representative of real usage, so logging is excluded for them. */
  var isLocalNerdpacks = false
  try {
    isLocalNerdpacks = new URLSearchParams(window.location.search).get('nerdpacks') === 'local'
  } catch (e) {
    // query param detection failed, leave logging on
  }

  // config
  window.NREUM={
    init: {
      feature_flags: ['register', 'rum_v2'],
      logging: {
        enabled: !isLocalNerdpacks
      },
      distributed_tracing: {
        enabled: true
      },
      ajax: {
        deny_list: [
          'nr-data.net',
          'bam.nr-data.net',
          'staging-bam.nr-data.net',
          'bam-cell.nr-data.net'
        ],
        capture_payloads: 'failures'
      },
      session_replay: {
        enabled: true,
        fix_stylesheets: false,
        {{#if (isEnvironment args.environment 'dev' 'staging')}}
        mask_all_inputs: false,
        mask_text_selector: null,
        {{else}}
        autoStart: false,
        {{/if}}
      },
      session_trace: {
        enabled: true
      },
      performance: {
        capture_marks: false,
        capture_measures: true,
        capture_detail: true,
        resources: {
          enabled: true,
          ignore_newrelic: false,
          first_party_domains: ['dev-one.nr-assets.net', 'staging-one.nr-assets.net', 'one.nr-assets.net', 'nr-assets.net']
        }
      },
      proxy: {},
      user_actions: {elementAttributes: ['id', 'className', 'tagName', 'type', 'ariaLabel', 'alt', 'title']},
      web_sockets: {
        enabled: true
      }
    },
    loader_config: {
      accountID: '1',
      trustKey: '1',
      agentID: '{{{args.appId}}}',
      licenseKey: '{{{args.licenseKey}}}',
      applicationID: '{{{args.appId}}}'
    },
    info: {
      beacon: 'staging-bam.nr-data.net',
      errorBeacon: 'staging-bam.nr-data.net',
      licenseKey: '{{{args.licenseKey}}}',
      applicationID: '{{{args.appId}}}',
      sa: 1
    }
  }

  {{{releasedScript}}}
})();
