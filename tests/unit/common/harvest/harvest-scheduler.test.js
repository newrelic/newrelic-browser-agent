import { faker } from '@faker-js/faker'

import * as submitData from '../../../../src/common/util/submit-data'
import { subscribeToEOL } from '../../../../src/common/unload/eol'
import { Harvest } from '../../../../src/common/harvest/harvest'

import { HarvestScheduler } from '../../../../src/common/harvest/harvest-scheduler'
import { ee } from '../../../../src/common/event-emitter/contextual-ee'

jest.enableAutomock()
jest.unmock('../../../../src/common/harvest/harvest-scheduler')
jest.useFakeTimers()

let harvestSchedulerInstance
let harvestInstance
let cbFinished

const target = { licenseKey: '12345', applicationID: '67890' }
const mockAgent = { agentRef: { info: target, ee } }

beforeEach(() => {
  cbFinished = jest.fn()
  harvestSchedulerInstance = new HarvestScheduler('test', {
    getPayload: jest.fn().mockReturnValue([{ payload: { foo: 'bar' }, target }]),
    onFinished: cbFinished
  }, mockAgent)
  harvestInstance = jest.mocked(Harvest).mock.instances[0]
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('unload', () => {
  let eolSubscribeFn

  beforeEach(() => {
    eolSubscribeFn = jest.mocked(subscribeToEOL).mock.calls[0][0]
    jest.spyOn(harvestSchedulerInstance, 'runHarvest').mockImplementation(jest.fn())
  })

  test('should subscribe to eol', () => {
    expect(subscribeToEOL).toHaveBeenCalledWith(expect.any(Function))
  })

  test('should run onUnload callback on EoL when provided', () => {
    harvestSchedulerInstance = new HarvestScheduler(undefined, { onUnload: jest.fn() }, mockAgent)

    for (const arr of jest.mocked(subscribeToEOL).mock.calls) arr[0]()

    expect(harvestSchedulerInstance.opts.onUnload).toHaveBeenCalledTimes(1)
  })

  test('should run harvest on EoL if not aborted', () => {
    harvestSchedulerInstance.aborted = false

    eolSubscribeFn()

    expect(harvestSchedulerInstance.runHarvest).toHaveBeenCalledWith({ unload: true })
  })

  test('should not run harvest when aborted', () => {
    harvestSchedulerInstance.aborted = true
    jest.spyOn(harvestSchedulerInstance, 'runHarvest').mockImplementation(jest.fn())

    eolSubscribeFn()

    expect(harvestSchedulerInstance.runHarvest).not.toHaveBeenCalled()
  })
})

describe('startTimer', () => {
  beforeEach(() => {
    jest.spyOn(harvestSchedulerInstance, 'scheduleHarvest').mockImplementation(jest.fn())
  })

  test('should use provided delay to schedule harvest', () => {
    const interval = faker.number.int({ min: 100, max: 1000 })
    const initialDelay = faker.number.int({ min: 100, max: 1000 })

    harvestSchedulerInstance.startTimer(interval, initialDelay)

    expect(harvestSchedulerInstance.interval).toEqual(interval)
    expect(harvestSchedulerInstance.started).toEqual(true)
    expect(harvestSchedulerInstance.scheduleHarvest).toHaveBeenCalledWith(initialDelay)
  })

  test('should use provided interval to schedule harvest when initialDelay is null', () => {
    const interval = faker.number.int({ min: 100, max: 1000 })

    harvestSchedulerInstance.startTimer(interval, null)

    expect(harvestSchedulerInstance.interval).toEqual(interval)
    expect(harvestSchedulerInstance.started).toEqual(true)
    expect(harvestSchedulerInstance.scheduleHarvest).toHaveBeenCalledWith(interval)
  })
})

describe('stopTimer', () => {
  beforeEach(() => {
    jest.spyOn(harvestSchedulerInstance, 'scheduleHarvest').mockImplementation(jest.fn())
  })

  test.each([
    false, undefined
  ])('should not abort the scheduler when permanently param is %s', (permanently) => {
    harvestSchedulerInstance.stopTimer(permanently)

    expect(harvestSchedulerInstance.aborted).toEqual(false)
    expect(harvestSchedulerInstance.started).toEqual(false)
  })

  test('should abort the scheduler when permanently param is true', () => {
    harvestSchedulerInstance.stopTimer(true)

    expect(harvestSchedulerInstance.aborted).toEqual(true)
    expect(harvestSchedulerInstance.started).toEqual(false)
  })

  test('should clear the timeoutHandle', () => {
    jest.spyOn(global, 'clearTimeout')
    const timeoutHandle = setTimeout(jest.fn(), 1000000)
    harvestSchedulerInstance.timeoutHandle = timeoutHandle

    harvestSchedulerInstance.stopTimer()

    expect(global.clearTimeout).toHaveBeenCalledWith(timeoutHandle)
  })
})

describe('scheduleHarvest', () => {
  beforeEach(() => {
    jest.spyOn(harvestSchedulerInstance, 'runHarvest').mockImplementation(jest.fn())
  })

  test('should runHarvest after the provided delay in seconds', () => {
    const delay = faker.number.int({ min: 100, max: 1000 })
    const opts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestSchedulerInstance.scheduleHarvest(delay, opts)

    expect(harvestSchedulerInstance.timeoutHandle).toEqual(expect.any(Number))
    expect(harvestSchedulerInstance.runHarvest).not.toHaveBeenCalled()

    jest.advanceTimersByTime(delay * 1000)

    expect(harvestSchedulerInstance.timeoutHandle).toEqual(null)
    expect(harvestSchedulerInstance.runHarvest).toHaveBeenCalledWith(opts)
  })

  test('should default delay to internal interval', () => {
    const interval = faker.number.int({ min: 100, max: 1000 })
    harvestSchedulerInstance.interval = interval
    const opts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestSchedulerInstance.scheduleHarvest(null, opts)

    expect(harvestSchedulerInstance.timeoutHandle).toEqual(expect.any(Number))
    expect(harvestSchedulerInstance.runHarvest).not.toHaveBeenCalled()

    jest.advanceTimersByTime(interval * 1000)

    expect(harvestSchedulerInstance.timeoutHandle).toEqual(null)
    expect(harvestSchedulerInstance.runHarvest).toHaveBeenCalledWith(opts)
  })

  test('should not call setTimeout when timeoutHandle already exists', () => {
    jest.spyOn(global, 'setTimeout')
    const timeoutHandle = setTimeout(jest.fn(), 1000000)
    harvestSchedulerInstance.timeoutHandle = timeoutHandle

    harvestSchedulerInstance.scheduleHarvest(null)

    expect(global.setTimeout).toHaveBeenCalledTimes(1)
  })
})

describe('runHarvest', () => {
  beforeEach(() => {
    jest.spyOn(harvestSchedulerInstance, 'scheduleHarvest').mockImplementation(jest.fn())
    jest.spyOn(harvestSchedulerInstance, 'onHarvestFinished').mockImplementation(jest.fn())
  })

  test('should not run harvest when scheduler is aborted', () => {
    harvestSchedulerInstance.aborted = true
    harvestSchedulerInstance.runHarvest()

    expect(harvestInstance.send).not.toHaveBeenCalled()
  })

  test('should use send for harvesting when getPayload is defined', () => {
    const payload = {
      body: {
        [faker.string.uuid()]: faker.lorem.sentence()
      },
      qs: {
        [faker.string.uuid()]: faker.lorem.sentence()
      }
    }
    harvestSchedulerInstance.endpoint = faker.string.uuid()
    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue([{ payload, target }])
    const harvestRunOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestSchedulerInstance.runHarvest(harvestRunOpts)

    expect(harvestInstance.send).toHaveBeenCalledWith({
      cbFinished: expect.any(Function),
      customUrl: undefined,
      endpoint: harvestSchedulerInstance.endpoint,
      opts: harvestRunOpts,
      payload,
      raw: undefined,
      submitMethod: expect.any(Function),
      target
    })
  })

  test('should use send for harvesting when opts.raw is true', () => {
    const payload = {
      body: {
        [faker.string.uuid()]: faker.lorem.sentence()
      },
      qs: {
        [faker.string.uuid()]: faker.lorem.sentence()
      }
    }
    harvestSchedulerInstance.endpoint = faker.string.uuid()
    harvestSchedulerInstance.opts.raw = true
    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue([{ payload, target }])
    const harvestRunOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestSchedulerInstance.runHarvest(harvestRunOpts)

    expect(harvestInstance.send).toHaveBeenCalledWith({
      cbFinished: expect.any(Function),
      customUrl: undefined,
      endpoint: harvestSchedulerInstance.endpoint,
      opts: harvestRunOpts,
      payload,
      raw: true,
      submitMethod: expect.any(Function),
      target
    })
  })

  test('should rescheduled harvesting when getPayload returns no data', () => {
    harvestSchedulerInstance.started = true
    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue()

    harvestSchedulerInstance.runHarvest()

    expect(harvestInstance.send).not.toHaveBeenCalled()
    expect(harvestSchedulerInstance.scheduleHarvest).toHaveBeenCalled()
  })

  test('should schedule the next harvest after running harvest', () => {
    const payload = {
      body: {
        [faker.string.uuid()]: faker.lorem.sentence()
      },
      qs: {
        [faker.string.uuid()]: faker.lorem.sentence()
      }
    }
    harvestSchedulerInstance.started = true
    harvestSchedulerInstance.endpoint = faker.string.uuid()
    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue([{ payload, target }])
    const harvestRunOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestSchedulerInstance.runHarvest(harvestRunOpts)

    expect(harvestInstance.send).toHaveBeenCalled()
    expect(harvestSchedulerInstance.scheduleHarvest).toHaveBeenCalled()
  })

  test.each([
    null, undefined, false
  ])('should set retry to true unload opt is %s', (unload) => {
    jest.mocked(submitData.getSubmitMethod).mockReturnValue(submitData.xhr)
    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue()

    harvestSchedulerInstance.runHarvest({ unload })

    expect(harvestSchedulerInstance.opts.getPayload).toHaveBeenCalledWith({ unload, retry: true })
  })

  test('should set retry to false when submitMethod is not xhr', () => {
    jest.mocked(submitData.getSubmitMethod).mockReturnValue(jest.fn())
    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue()

    harvestSchedulerInstance.runHarvest({ unload: false })

    expect(harvestSchedulerInstance.opts.getPayload).toHaveBeenCalledWith({ unload: false, retry: false })
  })

  test('should run onHarvestFinished after harvest finishes', () => {
    const harvestRunOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue([{ payload: { foo: 'bar' }, target }])
    harvestSchedulerInstance.runHarvest(harvestRunOpts)
    const cbFinishedFn = jest.mocked(harvestInstance.send).mock.calls[0][0].cbFinished
    cbFinishedFn(result)

    expect(harvestSchedulerInstance.onHarvestFinished).toHaveBeenCalledWith(harvestRunOpts, result)
  })

  test('should disable retry in harvest callback when forceNoRetry is true', () => {
    const harvestRunOpts = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      forceNoRetry: true
    }
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestSchedulerInstance.opts.getPayload = jest.fn().mockReturnValue([{ payload: { foo: 'bar' }, target }])
    harvestSchedulerInstance.runHarvest(harvestRunOpts)
    const cbFinishedFn = jest.mocked(harvestInstance.send).mock.calls[0][0].cbFinished
    cbFinishedFn(result)

    expect(harvestSchedulerInstance.onHarvestFinished).toHaveBeenCalledWith(harvestRunOpts, {
      ...result,
      retry: false
    })
  })
})

describe('onHarvestFinished', () => {
  beforeEach(() => {
    jest.spyOn(global, 'clearTimeout')
    jest.spyOn(harvestSchedulerInstance, 'scheduleHarvest').mockImplementation(jest.fn())
  })

  test('should call onFinished callback', () => {
    harvestSchedulerInstance.opts.onFinished = jest.fn()
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestSchedulerInstance.onHarvestFinished({}, result)

    expect(harvestSchedulerInstance.opts.onFinished).toHaveBeenCalledWith(result)
  })

  test.each([
    null, undefined, false
  ])('should not reschedule harvest when result.sent is %s', (sent) => {
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      sent,
      retry: true
    }

    harvestSchedulerInstance.onHarvestFinished({}, result)

    expect(harvestSchedulerInstance.scheduleHarvest).not.toHaveBeenCalled()
  })

  test.each([
    null, undefined, false
  ])('should not reschedule harvest when result.retry is %s', (retry) => {
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      sent: true,
      retry
    }

    harvestSchedulerInstance.onHarvestFinished({}, result)

    expect(harvestSchedulerInstance.scheduleHarvest).not.toHaveBeenCalled()
  })

  test('should reschedule harvest using result.delay', () => {
    const harvestOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      sent: true,
      retry: true,
      delay: faker.number.int({ min: 100, max: 1000 })
    }

    harvestSchedulerInstance.onHarvestFinished(harvestOpts, result)

    expect(harvestSchedulerInstance.scheduleHarvest).toHaveBeenCalledWith(result.delay, harvestOpts)
  })

  test('should reschedule harvest using instance retryDelay opt', () => {
    harvestSchedulerInstance.opts.retryDelay = faker.number.int({ min: 100, max: 1000 })
    const harvestOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      sent: true,
      retry: true
    }

    harvestSchedulerInstance.onHarvestFinished(harvestOpts, result)

    expect(harvestSchedulerInstance.scheduleHarvest).toHaveBeenCalledWith(harvestSchedulerInstance.opts.retryDelay, harvestOpts)
  })

  test.each([
    null, undefined, false, 0
  ])('should not reschedule harvest when delay is %s and scheduler not started', (delay) => {
    harvestSchedulerInstance.opts.retryDelay = delay
    const harvestOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      sent: true,
      retry: true,
      delay
    }

    harvestSchedulerInstance.onHarvestFinished(harvestOpts, result)

    expect(harvestSchedulerInstance.scheduleHarvest).not.toHaveBeenCalled()
  })

  test.each([
    null, undefined, false, 0
  ])('should not reschedule harvest when delay is %s and scheduler started', (delay) => {
    harvestSchedulerInstance.started = true
    harvestSchedulerInstance.opts.retryDelay = delay
    const harvestOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      sent: true,
      retry: true,
      delay
    }

    harvestSchedulerInstance.onHarvestFinished(harvestOpts, result)

    expect(harvestSchedulerInstance.scheduleHarvest).not.toHaveBeenCalled()
  })

  test('should clear the current timeout handle and reschedule the harvest', () => {
    const timeoutHandle = setTimeout(jest.fn(), 100000)
    harvestSchedulerInstance.opts.retryDelay = faker.number.int({ min: 100, max: 1000 })
    harvestSchedulerInstance.timeoutHandle = timeoutHandle
    harvestSchedulerInstance.started = true
    const harvestOpts = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    const result = {
      [faker.string.uuid()]: faker.lorem.sentence(),
      sent: true,
      retry: true
    }

    harvestSchedulerInstance.onHarvestFinished(harvestOpts, result)

    expect(global.clearTimeout).toHaveBeenCalledWith(timeoutHandle)
    expect(harvestSchedulerInstance.timeoutHandle).toEqual(null)
    expect(harvestSchedulerInstance.scheduleHarvest).toHaveBeenCalledWith(harvestSchedulerInstance.opts.retryDelay, harvestOpts)
  })
})
