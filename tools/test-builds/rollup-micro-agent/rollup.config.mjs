// rollup.config.mjs
import html from '@rollup/plugin-html'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import resolve from '@rollup/plugin-node-resolve' // <-- Import resolve
import commonjs from '@rollup/plugin-commonjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Custom template function for @rollup/plugin-html
 * @param {object} params - Rollup output parameters
 * @returns {string} The final HTML string
 */
const customTemplate = ({ attributes, files, meta, publicPath, title }) => {
  const scriptTag = files.js
    .map(({ fileName }) => `<script src="${publicPath}${fileName}" type="module"></script>`)
    .join('\n')

  // 3. Construct the HTML string with the generated script and your placeholders
  return (`
        <html>
        <head>
            <title>${title}</title>
            {init}
            {config}
            ${scriptTag}
        </head>
        <body>
            <h1>This is a generic page that is instrumented by the NPM agent</h1>
        </body>
        </html>
    `)
}

export default {
  input: 'src/micro-agent.js',
  output: {
    dir: path.resolve(__dirname, '../../../tests/assets/test-builds/rollup-micro-agent')
  },
  plugins: [
    resolve({ browser: true }),
    html({
      // Optional: Configuration for the generated HTML file

      // Set the title of the HTML page
      title: 'My Rollup App',

      // Optional: Set the filename for the generated HTML file
      fileName: 'index.html',

      template: customTemplate
    }),
    commonjs({
      dynamicRequireTargets: [
        'node_modules/@newrelic/browser-agent/features/**/*.js'
      ]
    })
  ]
}
