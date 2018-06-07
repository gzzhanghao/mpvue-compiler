import json5 from 'json5'
import cloneDeep from 'lodash.clonedeep'
import { SourceNode } from 'source-map'
import { transformFromAst } from '@babel/core'
import { parse as parseScript } from '@babel/parser'

import { compile as compileVue } from '../../vue-compiler'
import { compile as compileTemplate, compileToWxml } from '../../mpvue/packages/mpvue-template-compiler'

import { hyphenate } from './util'
import { babelPluginExtractMPMetadata } from './babel-plugins/extract-mp-metadata'

compileVue(`
  <template>
    <div>
      <textarea v-model="asdf" :data="data | filter">{{asdf | filter}}</textarea>
      <Component>
        <div>This is in slot</div>
      </Component>
      <Component v-for="i in 5">
        <div v-for="item in list">This is in slot</div>
        <div v-for="item in list">This is in slot</div>
        <div slot="hehe">hehe</div>
        <div slot="hehe">hehe</div>
        <div slot="hehe">hehe</div>
      </Component>
    </div>
  </template>

  <wxconf>
    {
      pages: [
        'pages/*',
      ],
    }
  </wxconf>

  <script>
    import filter from './filter'
    import Component from './Component'

    export default {
      filters: { filter },
      components: { Component },
    }
  </script>
`, {
  templateOptions: {
    compile: compileTemplate,
  },
  processOptions: {
    state: {},
    compilers: {
      wxconf(node) {
        const config = json5.parse(node.sourceNode.toString())
        if (config.pages) {
          // @todo resolve config.pages
        }
        // @todo emit json
        node.sourceNode = new SourceNode(null, null, null, `module.exports = function (mod) { mod.options.wxconfig = ${JSON.stringify(config)} }`)
      },
      script(node, builtin, state) {
        const sourceCode = node.sourceNode.toString()
        const ast = parseScript(sourceCode, {
          sourceType: 'module',
        })
        const wxsResult = transformFromAst(cloneDeep(ast), sourceCode, {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
          ],
          plugins: [
            babelPluginExtractMPMetadata,
          ],
        })
        // @todo emit wxs
        state.components = {}
        for (const name of Object.keys(wxsResult.metadata.components || {})) {
          state.components[hyphenate(name)] = { src: name }
        }
        const scriptResult = transformFromAst(ast, sourceCode, {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
          ],
        })
        node.sourceNode = new SourceNode(null, null, null, scriptResult.code)
        // @todo emit js
      },
      async template(node, builtin, state) {
        const compiledNode = await builtin(node)
        const wxmlResult = compileToWxml(compiledNode.compileResult, { components: state.components, name: 'name', moduleId: 'moduleId' })

        // @todo emit wxml
        console.log(wxmlResult)

        return compiledNode
      },
      style(node) {
        // @todo emit wxss
      },
    },
  },
}).then((res) => {
  console.log(res.code)
}, (err) => {
  console.log(err)
})
