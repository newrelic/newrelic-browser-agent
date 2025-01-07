// create a jest mock of the Harvester class
export const Harvester = jest.fn().mockImplementation(() => ({
  startTimer: jest.fn(),
  triggerHarvestFor: jest.fn(),
  initializedAggregates: []
}))
