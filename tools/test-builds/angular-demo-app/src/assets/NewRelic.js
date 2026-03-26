window.__nrWarnings = []
window.__nrWarningCallback = null
localStorage.clear()
window.NREUM || (NREUM = {})
NREUM.init = {
  session_replay: {
    enabled: true,
    block_selector: '',
    mask_text_selector: '',
    sampling_rate: 100.0,
    error_sampling_rate: 100.0,
    mask_all_inputs: true,
    collect_fonts: true,
    inline_images: true,
    inline_stylesheet: true,
    fix_stylesheets: true,
    preload: true,
    mask_input_options: {}
  },
  distributed_tracing: { enabled: true },
  performance: { capture_measures: true },
  browser_consent_mode: { enabled: false },
  privacy: { cookies_enabled: true },
  ajax: { deny_list: ['bam.nr-data.net'] }
}

// add your own test app info
/*
NREUM.loader_config = {
}

NREUM.info = {
}
 */
