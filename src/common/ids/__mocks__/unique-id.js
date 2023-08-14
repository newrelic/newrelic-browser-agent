import { faker } from '@faker-js/faker'

export function generateUuid () {
  return faker.datatype.uuid()
}

export function generateRandomHexString (length) {
  return faker.datatype.hexadecimal({ length, prefix: '' })
}

export function generateSpanId () {
  return generateRandomHexString(16)
}

export function generateTraceId () {
  return generateRandomHexString(32)
}
