/**
 * @file This custom babel plugin swaps out import statements. Whenever an import path is encountered, it
 * is checked against key-value pairs of RegEx patterns defined in the plugin config options block.
 * To understand the code (which uses the Visitor pattern to traverse an Abstract Source Tree), see the Babel
 * [plugin handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md).
 */

const develRegex = /develblock:start[\s\S]*?develblock:end/gim

module.exports = function (nrbaParserOpts) {
  return function () {
    return {
      parserOverride (code, parserOpts, babelParser) {
        if (nrbaParserOpts.removeDevelBlocks) {
          code = code.replaceAll(develRegex, '')
        }

        return babelParser(code, parserOpts)
      }
    }
  }
}
