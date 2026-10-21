const { shouldUseColor, createStyle, highlight } = require('../../../../tools/supportability-metrics/colors')

describe('shouldUseColor', () => {
  test('is off when NO_COLOR is set, even if FORCE_COLOR is also set or output is a terminal', () => {
    expect(shouldUseColor({ NO_COLOR: '1', FORCE_COLOR: '1' }, true)).toBe(false)
  })

  test('is on when FORCE_COLOR is set, even if output is not a terminal (the pre-commit hook sets it)', () => {
    expect(shouldUseColor({ FORCE_COLOR: '1' }, false)).toBe(true)
  })

  test('is off when FORCE_COLOR is 0 or false', () => {
    expect(shouldUseColor({ FORCE_COLOR: '0' }, true)).toBe(false)
    expect(shouldUseColor({ FORCE_COLOR: 'false' }, true)).toBe(false)
  })

  test('follows whether output is a terminal when nothing is set, so CI logs and pipes stay plain', () => {
    expect(shouldUseColor({}, true)).toBe(true)
    expect(shouldUseColor({}, false)).toBe(false)
  })
})

describe('createStyle', () => {
  test('returns text unchanged when color is off', () => {
    const style = createStyle(false)

    expect(style.bold('text')).toBe('text')
    expect(style.tag('text')).toBe('text')
    expect(style.required('text')).toBe('text')
  })

  test('wraps text in ANSI codes when color is on', () => {
    expect(createStyle(true).red('text')).toBe('\u001b[31mtext\u001b[39m')
  })

  test('combines styles for the semantic helpers', () => {
    expect(createStyle(true).tag('x')).toContain('\u001b[1m')
    expect(createStyle(true).tag('x')).toContain('\u001b[33m')
  })

  test('stringifies non-string input', () => {
    expect(createStyle(false).bold(5)).toBe('5')
  })
})

describe('highlight', () => {
  const plain = createStyle(false)

  test('leaves the text readable when color is off', () => {
    const message = 'Emitted but not in the registry: "A/B/C" (src/features/x.js:12). Add it to tools/supportability-metrics/registry.js.'

    expect(highlight(message, plain)).toBe(message)
  })

  test('colors quoted metric names and file paths with line numbers when color is on', () => {
    const colored = highlight('Emitted "A/B/C" at src/features/x.js:12 and tools/supportability-metrics/registry.js', createStyle(true))

    expect(colored).toContain('\u001b[33m')
    expect(colored).toContain('\u001b[36msrc/features/x.js:12\u001b[39m')
    expect(colored).toContain('\u001b[36mtools/supportability-metrics/registry.js\u001b[39m')
  })
})
