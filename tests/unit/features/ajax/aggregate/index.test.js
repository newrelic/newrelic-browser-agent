/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Aggregate } from '../../../../../src/features/ajax/aggregate'
import { V2_TYPES } from '../../../../../src/common/v2/constants'

/**
 * Builds a minimal object that inherits from `Aggregate.prototype` -- letting `storeXhr`/`reportContainerEvent` run
 * as real prototype methods -- without invoking the real constructor (which has unrelated side effects: harvester
 * registration, event-emitter subscriptions, etc. not relevant to storeXhr's logic under test).
 */
function buildAggregate ({ harvestEndpointVersion = 1, ...overrides } = {}) {
  const aggregate = Object.assign(Object.create(Aggregate.prototype), {
    events: { add: jest.fn() },
    reportSupportabilityMetric: jest.fn(),
    ee: { emit: jest.fn(), buffer: jest.fn() },
    agentRef: {
      features: {},
      beacons: [],
      info: { jsAttributes: {} },
      init: {
        feature_flags: [],
        ajax: { capture_payloads: 'none' },
        api: { register: { duplicate_data_to_container: false } }
      },
      runtime: {
        timeKeeper: { correctAbsoluteTimestamp: (ts) => ts },
        v2Target: { attributes: { 'entity.guid': 'container-guid', appId: 'container-app-id' } }
      }
    },
    ...overrides
  })
  // `harvestEndpointVersion` is a getter-only property on AggregateBase.prototype -- shadow it with an own,
  // writable property rather than assigning through the (setter-less) prototype accessor.
  Object.defineProperty(aggregate, 'harvestEndpointVersion', { value: harvestEndpointVersion, configurable: true })
  return aggregate
}

const mfeTarget = { type: V2_TYPES.MFE, id: 'mfe-1', attributes: { 'source.id': 'mfe-1', 'source.name': 'checkout', 'source.type': 'MFE', 'parent.id': 'container-app-id' } }
const containerTarget = { type: V2_TYPES.BA, id: 'container' }

function callStoreXhr (aggregate, { target, ctx = {} } = {}) {
  aggregate.storeXhr(
    { method: 'GET', status: 200, hostname: 'example.com', host: 'example.com', pathname: '/api' },
    { txSize: 0, rxSize: 0, cbTime: 0 },
    100,
    200,
    'xhr',
    target,
    ctx
  )
}

test('MFE-attributed event and its container-duplicate copy get independent spanId/traceId pairs when duplicate_data_to_container is enabled', () => {
  const aggregate = buildAggregate({
    harvestEndpointVersion: 2,
    agentRef: {
      features: {},
      beacons: [],
      info: { jsAttributes: {} },
      init: {
        feature_flags: [],
        ajax: { capture_payloads: 'none' },
        api: { register: { duplicate_data_to_container: true } }
      },
      runtime: {
        timeKeeper: { correctAbsoluteTimestamp: (ts) => ts },
        v2Target: { attributes: { 'entity.guid': 'container-guid', appId: 'container-app-id' } }
      }
    }
  })

  const ctx = { dt: { spanId: 'live-span-id', traceId: 'live-trace-id', timestamp: 1000 } }

  callStoreXhr(aggregate, { target: mfeTarget, ctx })

  expect(aggregate.events.add).toHaveBeenCalledTimes(2)
  const [mfeEvent] = aggregate.events.add.mock.calls[0]
  const [duplicateEvent] = aggregate.events.add.mock.calls[1]

  expect(mfeEvent.spanId).toEqual('live-span-id')
  expect(mfeEvent.traceId).toEqual('live-trace-id')
  expect(duplicateEvent.spanId).toBeTruthy()
  expect(duplicateEvent.traceId).toBeTruthy()
  expect(duplicateEvent.spanId).not.toEqual(mfeEvent.spanId)
  expect(duplicateEvent.traceId).not.toEqual(mfeEvent.traceId)
  // spanTimestamp still reflects the real call's timing, only the id namespace is independent
  expect(duplicateEvent.spanTimestamp).toEqual(mfeEvent.spanTimestamp)
})

test('duplicate event has no spanId/traceId at all when the MFE event has none either (e.g. distributed tracing disabled), matching legacy behavior', () => {
  const aggregate = buildAggregate({
    harvestEndpointVersion: 2,
    agentRef: {
      features: {},
      beacons: [],
      info: { jsAttributes: {} },
      init: {
        feature_flags: [],
        ajax: { capture_payloads: 'none' },
        api: { register: { duplicate_data_to_container: true } }
      },
      runtime: {
        timeKeeper: { correctAbsoluteTimestamp: (ts) => ts },
        v2Target: { attributes: {} }
      }
    }
  })

  callStoreXhr(aggregate, { target: mfeTarget, ctx: {} })

  expect(aggregate.events.add).toHaveBeenCalledTimes(2)
  const [mfeEvent] = aggregate.events.add.mock.calls[0]
  const [duplicateEvent] = aggregate.events.add.mock.calls[1]

  expect(mfeEvent.spanId).toBeUndefined()
  expect(duplicateEvent.spanId).toBeUndefined()
  expect(duplicateEvent.traceId).toBeUndefined()
})

test('MFE-attributed event is not duplicated when duplicate_data_to_container is disabled', () => {
  const aggregate = buildAggregate({ harvestEndpointVersion: 2 })

  callStoreXhr(aggregate, { target: mfeTarget, ctx: { dt: { spanId: 'a', traceId: 'b', timestamp: 1000 } } })

  expect(aggregate.events.add).toHaveBeenCalledTimes(1)
})

test('container-only target is unaffected -- event shape is unchanged from today\'s behavior', () => {
  const aggregate = buildAggregate()
  const ctx = { dt: { spanId: 'container-span-id', traceId: 'container-trace-id', timestamp: 1000 } }

  callStoreXhr(aggregate, { target: containerTarget, ctx })

  expect(aggregate.events.add).toHaveBeenCalledTimes(1)
  const [event] = aggregate.events.add.mock.calls[0]
  expect(event.spanId).toEqual('container-span-id')
  expect(event.traceId).toEqual('container-trace-id')
  expect(event.targetAttributes).toBeUndefined()
})
