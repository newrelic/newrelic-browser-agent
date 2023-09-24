const { isValidSelector } = require('../../common/dom/query-selector')
const { warn } = require('../../common/util/console')

export const model = () => {
  const hiddenState = {
    mask_selector: '*',
    block_selector: '[data-nr-block]',
    mask_input_options: {
      color: false,
      date: false,
      'datetime-local': false,
      email: false,
      month: false,
      number: false,
      range: false,
      search: false,
      tel: false,
      text: false,
      time: false,
      url: false,
      week: false,
      // unify textarea and select element with text input
      textarea: false,
      select: false,
      password: true // This will be enforced to always be true in the setter
    }
  }
  return {
    session_replay: {
      // feature settings
      autoStart: true,
      enabled: false,
      harvestTimeSeconds: 60,
      sampling_rate: 50, // float from 0 - 100
      error_sampling_rate: 50, // float from 0 - 100
      // recording config settings
      mask_all_inputs: true,
      // this has a getter/setter to facilitate validation of the selectors
      get mask_text_selector () { return hiddenState.mask_selector },
      set mask_text_selector (val) {
        if (isValidSelector(val) || val === null) hiddenState.mask_selector = val // null is acceptable, which completely disables the behavior
        else warn('An invalid session_replay.mask_selector was provided and will not be used', val)
      },
      // these properties only have getters because they are enforcable constants and should error if someone tries to override them
      get block_class () { return 'nr-block' },
      get ignore_class () { return 'nr-ignore' },
      get mask_text_class () { return 'nr-mask' },
      // props with a getter and setter are used to extend enforcable constants with customer input
      // we must preserve data-nr-block no matter what else the customer sets
      get block_selector () {
        return hiddenState.block_selector
      },
      set block_selector (val) {
        if (isValidSelector(val)) hiddenState.block_selector += `,${val}`
        else if (val !== '') warn('An invalid session_replay.block_selector was provided and will not be used', val)
      },
      // password: must always be present and true no matter what customer sets
      get mask_input_options () {
        return hiddenState.mask_input_options
      },
      set mask_input_options (val) {
        if (val && typeof val === 'object') hiddenState.mask_input_options = { ...val, password: true }
        else warn('An invalid session_replay.mask_input_option was provided and will not be used', val)
      }
    },
    session_trace: { enabled: true }
  }
}
