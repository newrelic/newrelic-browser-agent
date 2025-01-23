/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { dataSize } from '../../../common/util/data-size'

export function responseSizeFromXhr (xhr, lastSize) {
  var type = xhr.responseType
  if (type === 'json' && lastSize !== null) return lastSize
  // Caution! Chrome throws an error if you try to access xhr.responseText for binary data
  if (type === 'arraybuffer' || type === 'blob' || type === 'json') {
    return dataSize(xhr.response)
  } else if (type === 'text' || type === '' || type === undefined) { // empty string type defaults to 'text'
    return dataSize(xhr.responseText)
  } else { // e.g. ms-stream and document (we do not currently determine the size of Document objects)
    return undefined
  }
}
