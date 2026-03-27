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
  privacy: { cookies_enabled: true },
}

// add your own test app info
/*
NREUM.loader_config = {
}
NREUM.info = {
}
 */
