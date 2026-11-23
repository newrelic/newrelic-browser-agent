import { eventOrigin } from '../../../../src/common/util/event-origin'

describe('without a usable FileReader constructor', () => {
  const fileReaderDescriptor = Object.getOwnPropertyDescriptor(global, 'FileReader')

  afterEach(() => {
    Object.defineProperty(global, 'FileReader', fileReaderDescriptor)
  })

  test('classifies an unknown target when FileReader is absent', () => {
    delete global.FileReader

    expect(eventOrigin(null, {})).toBe('unknown')
  })

  test.each([undefined, null])('classifies an unknown target when FileReader is %s', value => {
    global.FileReader = value

    expect(eventOrigin(null, {})).toBe('unknown')
  })
})

test('classifies a FileReader instance', () => {
  expect(eventOrigin(null, new FileReader())).toBe('FileReader')
})

test.each([
  ['custom', 'custom'],
  [document, 'document'],
  [window, 'window']
])('preserves the %s fallback classification', (target, origin) => {
  expect(eventOrigin(null, target)).toBe(origin)
})
