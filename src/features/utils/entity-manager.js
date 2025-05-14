/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_KEY } from '../../common/constants/agent-constants'

export class EntityManager {
  #entities = new Map()
  #entityGuidLookup = {}

  constructor (agentRef) {
    this.agentRef = agentRef
    this.#entities.set(DEFAULT_KEY, { licenseKey: agentRef.info.licenseKey, applicationID: agentRef.info.applicationID })
  }

  get (entityGuid = DEFAULT_KEY) {
    return this.#entities.get(entityGuid)
  }

  getEntityGuidFor (licenseKey, applicationID) {
    if (!this.#entityGuidLookup[licenseKey] || !this.#entityGuidLookup[applicationID]) return
    return this.#entityGuidLookup[licenseKey].filter(x => this.#entityGuidLookup[applicationID].includes(x))[0]
  }

  set (entityGuid, entity) {
    if (this.#entities.has(entityGuid)) return
    this.#entities.set(entityGuid, entity)

    this.#entityGuidLookup[entity.licenseKey] ??= []
    this.#entityGuidLookup[entity.licenseKey].push(entityGuid)
    this.#entityGuidLookup[entity.applicationID] ??= []
    this.#entityGuidLookup[entity.applicationID].push(entityGuid)

    this.agentRef.ee.emit('entity-added', [entity])
  }

  clear () {
    this.#entities.clear()
  }

  setDefaultEntity (entity) {
    this.#entities.set(DEFAULT_KEY, entity)
  }
}
