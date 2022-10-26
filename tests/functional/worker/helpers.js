const browserMatcher = require('../../../tools/jil/index').Matcher

const workerTypes = ['classic', 'module']
/**
 * @param {string} type - one of the workerTypes
 * @returns BrowserMatcher for the versions that support the type of worker
 */
const typeToMatcher = (type) => {
	switch (type) {
		case 'classic':
			return browserMatcher.withFeature('workers');
		case 'module':
			return browserMatcher.withFeature('workersFull');
	}
}

module.exports = {workerTypes, typeToMatcher}