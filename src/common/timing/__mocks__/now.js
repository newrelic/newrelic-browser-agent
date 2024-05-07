export const now = jest.fn(() => performance.now())
export const flooredNow = jest.fn(() => Math.floor(now()))
