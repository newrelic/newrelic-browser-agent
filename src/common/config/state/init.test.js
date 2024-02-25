let getConfiguration, setConfiguration, getConfigurationValue
beforeEach(async () => {
  jest.resetModules()
  ;({ getConfiguration, setConfiguration, getConfigurationValue } = await import('./init.js'))
})

test('set/getConfiguration should throw on an invalid agent id', () => {
  // currently only checks if it's a truthy value
  expect(() => setConfiguration(undefined, {})).toThrow('require an agent id')
  expect(() => getConfiguration(undefined)).toThrow('require an agent id')
  expect(() => setConfiguration('', {})).toThrow('require an agent id')
  expect(() => getConfiguration('')).toThrow('require an agent id')
})

test('set/getConfiguration works correctly', () => {
  expect(() => setConfiguration(123, { jserrors: { enabled: false } })).not.toThrow() // notice setConfiguration accepts numbers
  let cachedObj = getConfiguration('123')
  expect(Object.keys(cachedObj).length).toBeGreaterThan(1)
  expect(cachedObj.jserrors.enabled).toEqual(false)
  expect(cachedObj.page_action.enabled).toEqual(true) // this should mirror default in init.js
})

test('getConfigurationValue parses path correctly', () => {
  setConfiguration('ab', { page_action: { harvestTimeSeconds: 1000 } })
  expect(getConfigurationValue('ab', '')).toBeUndefined()
  expect(getConfigurationValue('ab', 'page_action')).toEqual({ enabled: true })
  expect(getConfigurationValue('ab', 'page_action.dne')).toBeUndefined()
})

describe('property getters/setters used for validation', () => {
  test('invalid values do not pass through', () => {
    setConfiguration('12345', {
      session_replay: {
        block_selector: '[invalid selector]',
        mask_text_selector: '[invalid selector]',
        mask_input_options: 'select:true'
      }
    })

    expect(getConfigurationValue('12345', 'session_replay.block_selector')).toEqual('[data-nr-block]')
    expect(getConfigurationValue('12345', 'session_replay.mask_text_selector')).toEqual('*')
    expect(getConfigurationValue('12345', 'session_replay.mask_input_options')).toMatchObject({ password: true, select: false })
  })

  test('valid values do pass through', () => {
    setConfiguration('23456', {
      session_replay: {
        block_selector: '[block-text-test]',
        mask_text_selector: '[mask-text-test]',
        mask_input_options: { select: true }
      }
    })

    expect(getConfigurationValue('23456', 'session_replay.block_selector')).toEqual('[data-nr-block],[block-text-test]')
    expect(getConfigurationValue('23456', 'session_replay.mask_text_selector')).toEqual('[mask-text-test],[data-nr-mask]')
    expect(getConfigurationValue('23456', 'session_replay.mask_input_options')).toMatchObject({ password: true, select: true })
  })

  test('null accepted for mask_text', () => {
    setConfiguration('34567', {
      session_replay: {
        mask_text_selector: null
      }
    })

    expect(getConfigurationValue('34567', 'session_replay.mask_text_selector')).toEqual('[data-nr-mask]')
  })

  test('empty string accepted for mask_text', () => {
    setConfiguration('34567', {
      session_replay: {
        mask_text_selector: ''
      }
    })

    expect(getConfigurationValue('34567', 'session_replay.mask_text_selector')).toEqual('[data-nr-mask]')
  })
})
