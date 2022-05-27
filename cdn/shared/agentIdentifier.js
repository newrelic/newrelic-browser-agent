import { generateRandomHexString } from '@newrelic/browser-agent-core/common/ids/unique-id'
// generate uniqueId for all instances to share
export default generateRandomHexString(16);