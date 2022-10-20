const browserMatcher = require('../../../tools/jil/index').Matcher
const workerTypes = ['classic', 'module']

const typeToMatcher = (type) => {
	switch (type) {
		case 'classic':
			return browserMatcher.withFeature('workers');
		case 'module':
			return browserMatcher.withFeature('workersFull');
	}
}

module.exports = {workerTypes, typeToMatcher}