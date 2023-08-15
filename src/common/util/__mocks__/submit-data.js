export const getSubmitMethod = jest.fn(() => jest.fn())
export const xhr = jest.fn(() => ({
  addEventListener: jest.fn()
}))
export const beacon = jest.fn(() => true)
