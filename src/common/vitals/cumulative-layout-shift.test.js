import { cumulativeLayoutShift } from './cumulative-layout-shift'

afterEach(() => {
  jest.resetAllMocks()
})

describe('cls', () => {
  test('reports cls', (done) => {
    cumulativeLayoutShift.subscribe(({ current: value }) => {
      expect(value).toEqual(1)
      done()
    })
  })
  test('reports only new values', (done) => {
    let triggered = 0
    cumulativeLayoutShift.subscribe(({ current: value }) => {
      triggered++
      expect(value).toEqual(1)
      expect(triggered).toEqual(1)
      setTimeout(() => {
        expect(triggered).toEqual(1)
        done()
      }, 1000)
    })
  })
})
