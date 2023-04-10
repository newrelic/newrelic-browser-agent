function replacePath (importPath, state) {
  if (!importPath) return importPath

  let newPath = importPath

  for (let key in state.opts) {
    const regex = new RegExp(key)
    if (importPath.match(regex)) {
      newPath = importPath.replace(regex, state.opts[key])
    }
  }

  return newPath
}

module.exports = function ({ types }) {
  const visitor = {
    CallExpression (path, state) {
      if (path.node.callee.name !== 'require') return

      const args = path.node.arguments

      if (!args.length) return

      const firstArg = getArg(t, args[0])

      if (firstArg) {
        firstArg.value = replacePath(firstArg.value, state)
      }
    },
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
