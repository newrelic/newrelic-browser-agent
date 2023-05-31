import { setConfiguration } from '../config/state/init'
import { HarvestScheduler } from './harvest-scheduler'

describe('runHarvest', () => {
  it('should re-schedule harvest even if there is no accumulated data', () => {
    setConfiguration('asdf', {})
    const scheduler = new HarvestScheduler('events', { getPayload: jest.fn() }, { agentIdentifier: 'asdf', ee: { on: jest.fn() } })
    scheduler.started = true
    jest.spyOn(scheduler, 'scheduleHarvest')
    scheduler.runHarvest()
    expect(scheduler.opts.getPayload()).toBeFalsy()
    expect(scheduler.scheduleHarvest).toHaveBeenCalledTimes(1)
  })

  it('should also re-schedule harvest if there is accumulated data', () => {
    setConfiguration('asdf', {})
    const scheduler = new HarvestScheduler('events', { getPayload: jest.fn().mockImplementation(() => 'payload') }, { agentIdentifier: 'asdf', ee: { on: jest.fn() } })
    scheduler.started = true
    scheduler.harvest._send = () => {}
    jest.spyOn(scheduler, 'scheduleHarvest')
    scheduler.runHarvest()
    expect(scheduler.opts.getPayload()).toBeTruthy()
    expect(scheduler.scheduleHarvest).toHaveBeenCalledTimes(1)
  })
})
