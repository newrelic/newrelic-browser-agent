/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const DEFAULT_ENTITY = 'default'

export class EntityManager {
  #entities = new Map()
  #defaultEntity = null

  constructor (agentRef) {
    this.#defaultEntity = { licenseKey: agentRef.info.licenseKey, applicationID: agentRef.info.applicationID }
  }

  set (entityGuid, entity) {
    if (this.#entities.has(entityGuid)) return
    /** add the entity guid to the default entity if the given */
    if (this.#defaultEntity.licenseKey === entity.licenseKey && this.#defaultEntity.applicationID === entity.applicationID && entity.entityGuid && !this.#defaultEntity.entityGuid) this.#defaultEntity = entity
    this.#entities.set(entityGuid, entity)
  }

  get (entityGuid) {
    if (entityGuid === DEFAULT_ENTITY || !entityGuid || !this.#entities.has(entityGuid)) return this.#defaultEntity
    return this.#entities.get(entityGuid)
  }
}
