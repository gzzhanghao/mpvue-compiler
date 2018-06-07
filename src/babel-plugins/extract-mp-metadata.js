export const babelPluginExtractMPMetadata = () => ({
  visitor: {
    ExportDefaultDeclaration(path) {
      const decl = path.get('declaration')
      if (!decl.isObjectExpression()) {
        return path.stop()
      }
      const props = decl.get('properties')
      for (const prop of props) {
        if (!prop.get('key').isIdentifier()) {
          continue
        }
        const { name } = prop.get('key').node
        if (name === 'components' && prop.get('value').isObjectExpression()) {
          prop.hub.file.metadata.components = extractComponents(prop.get('value'))
        }
        if (name !== 'filters') {
          prop.remove()
        }
      }
      path.stop()
    },
  },
})

function extractComponents(path) {
  const { bindings } = path.scope
  const components = {}
  for (const prop of path.get('properties')) {
    if (!prop.get('value').isIdentifier()) {
      continue
    }
    const { name } = prop.get('value').node
    const binding = bindings[name]
    if (!binding || !binding.path.isImportDefaultSpecifier()) {
      continue
    }
    const src = binding.path.parentPath.get('source')
    if (!src.isStringLiteral()) {
      continue
    }
    components[name] = src.node.value
  }
  return components
}
