(function() {
  // ===== EXPERIMENT DETECTION & ROUTING =====
  // Query-param based experiment loading: ?nrbaExperiment={branch-name}
  // Loads config.js (sets window.NREUM) then nr-loader-spa.min.js
  try {
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
  // config
  window.NREUM={
    init: {
      feature_flags: ['register'],
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
      user_actions: {elementAttributes: ['id', 'className', 'tagName', 'type', 'ariaLabel', 'alt', 'title']}
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
