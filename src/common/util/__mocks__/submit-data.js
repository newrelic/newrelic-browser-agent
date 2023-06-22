export const getSubmitMethod = jest.fn(() => jest.fn())
export const xhr = jest.fn(() => ({
  addEventListener: jest.fn()
}))
export const fetchKeepAlive = jest.fn().mockResolvedValue({})
export const beacon = jest.fn(() => true)
