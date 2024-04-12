/**
 * @file This custom babel plugin swaps out import statements. Whenever an import path is encountered, it
 * is checked against key-value pairs of RegEx patterns defined in the plugin config options block.
 * To understand the code (which uses the Visitor pattern to traverse an Abstract Source Tree), see the Babel
 * [plugin handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md).
 */

/**
 * Replaces part(s) of an import path based on key-value RegEx pairs from plugin state options.
 *
 * @param {string} importPath - The original import path to modify.
 * @param {Object} state - A state object containing options to use for replacement.
 * @returns {string} - The modified import path with the replaced value.
 */
function replacePath (importPath, state) {
  if (!importPath) return importPath

  let newPath = importPath

  for (const key in state.opts) {
    const regex = new RegExp(key)
    if (importPath.match(regex)) {
      newPath = importPath.replace(regex, state.opts[key])
    }
  }

  return newPath
}

module.exports = function ({ types: t }) {
  /**
   * A visitor object containing methods for modifying specific types of nodes encountered in the Abstract Source Tree.
   * The state parameter is used to pass along the current state of the plugin as it traverses the AST. We use it
   * specifically for access to plugin options.
   *
   * @type {Object}
   * @property {Function} CallExpression - A function to modify CallExpression nodes.
   * @property {Function} ImportDeclaration - A function to modify ImportDeclaration nodes.
   * @property {Function} ExportNamedDeclaration - A function to modify ExportNamedDeclaration nodes.
   * @property {Function} ExportAllDeclaration - A function to modify ExportAllDeclaration nodes.
   */
  const visitor = {
    ImportDeclaration (path, state) {
      if (path.node.source) {
        path.node.source.value = replacePath(path.node.source.value, state)
      }
    },
    ExportNamedDeclaration (path, state) {
      if (path.node.source) {
        path.node.source.value = replacePath(path.node.source.value, state)
      }
    },
    ExportAllDeclaration (path, state) {
      if (path.node.source) {
        path.node.source.value = replacePath(path.node.source.value, state)
      }
    }
  }

  return {
    visitor: {
      Program (path, state) {
        path.traverse(visitor, state)
      }
    }
  }
}
