export const qs = jest.fn((input) => encodeURIComponent(input))
export const fromArray = jest.fn((input) => input.join(''))
export const obj = jest.fn((input) => Object.entries(input)
  .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
  .join('&')
)
export const param = jest.fn((name, value) => `&${name}=${encodeURIComponent(value)}`)
