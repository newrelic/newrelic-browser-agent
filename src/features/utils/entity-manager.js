/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export class EntityManager {
  #entities = new Map()
  #defaultEntity = null

  constructor (agentRef) {
    this.agentRef = agentRef
    this.#defaultEntity = { licenseKey: agentRef.info.licenseKey, applicationID: agentRef.info.applicationID }
  }

  get (entityGuid) {
    if (!entityGuid) return this.#defaultEntity
    return this.#entities.get(entityGuid)
  }

  set (entityGuid, entity) {
    if (this.#entities.has(entityGuid)) return
    this.#entities.set(entityGuid, entity)
    this.agentRef.ee.emit('entity-added', [entity])
  }

  clear () {
    this.#entities.clear()
  }

  setDefaultEntity (entity) {
    this.#defaultEntity = entity
  }
}
