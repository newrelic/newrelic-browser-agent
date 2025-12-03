/* eslint-disable */
// eslint-disable-file
window.localStorage.clear()
window.NREUM || (NREUM = {})
NREUM.init = {
  session_replay: {
    enabled: true,
    block_selector: '',
    mask_text_selector: '*',
    sampling_rate: 100.0,
    error_sampling_rate: 100.0,
    mask_all_inputs: true,
    collect_fonts: true,
    inline_images: false,
    inline_stylesheet: true,
    fix_stylesheets: true,
    preload: false,
    mask_input_options: {}
  },
  distributed_tracing: {
    enabled: true
  },
  performance: {
    capture_marks: true, capture_measures: true
  },
  browser_consent_mode: {
    enabled: false
  },
  privacy: {
    cookies_enabled: true
  },
  ajax: {
    deny_list: ['staging-bam-cell.nr-data.net']
  }
}
NREUM.feature_flags = ['soft_nav', 'websockets']
NREUM.info = { beacon: 'staging-bam-cell.nr-data.net', errorBeacon: 'staging-bam-cell.nr-data.net', licenseKey: '{{{latestLicenseKey}}}', applicationID: '275822177', sa: 1 }
