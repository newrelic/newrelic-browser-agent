export const TimeKeeper = jest.fn(function () {})
TimeKeeper.now = jest.fn(() => performance.now())
TimeKeeper.getTimeKeeperByAgentIdentifier = jest.fn(() => new TimeKeeper())
