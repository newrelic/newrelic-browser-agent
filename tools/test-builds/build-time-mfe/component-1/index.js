import nr from 'nr-browser-core'

// const nrConfig = {
//     applicationID: '35094707',
//     beacon: 'staging-bam-cell.nr-data.net',
//     licenseKey: '2fec6ab188',
//     ajax: {deny_list: ['nr-data.net']}
// }

/* 
features: {'js-errors': {
  auto: true, // 
  api: true // if disabled, it also disables auto
}}

features: {
  'errors': {
    enabled: true, // if false --> don't import anything | else import based on logic dealing w/ 'global'
    scoped: false // if true --> import ins (if exists) + agg | else --> import only agg (if exists)
  }
}

// could use getters and setters to ensure they can only set the appropriate data
// defaults to true, true
const errors = {
  enabled: true, // if false --> don't import anything | else import based on logic dealing w/ 'global'
  auto: true // if true --> import ins (if exists) + agg | else --> import only agg (if exists)
}

nr = {
  features: {
    'errors': {
      get enabled(){ return errors.enabled },
      set enabled(val) {
        errors.enabled = Boolean(val)
      },
      get scoped(){ return errors.scoped },
      set scoped(val) {
        errors.scoped = Boolean(val)
      },
    }
  }
}
*/
// const nrConfig = {
//     applicationID: '35094707',
//     beacon: 'staging-bam-cell.nr-data.net',
//     licenseKey: '2fec6ab188',
//     ajax: {deny_list: ['nr-data.net']}
// }

// const nrConfig = { ...NREUM.init, ...NREUM.info, ...NREUM.loader_config, licenseKey: 'asdf', applicationID: 1 }
const nrConfig = {
  ...NREUM.init,
   ...NREUM.info, 
   ...NREUM.loader_config, 
  // licenseKey: 'asdf',
  applicationID: 1
}
nr.start(nrConfig).then(() => {
  console.log("agent initialized! -- COMPONENT-1", nrConfig)
})

class PuppyComponent extends HTMLElement {
  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.elem = document.createElement('img')
    this.shadow.addEventListener("click", () => {
      nr.noticeError(new Error('Component 1 Error'))
      // throw new Error('Component 1 Error')
    })
    this.name = 'Puppy Component'
    this.setImg()
  }

  fetchImg = async () => {
    const params = { api_key: 'TMWFkdtKTv6To8CjL9OqC2KBNQTM8D3N', q: 'puppy', limit: 100 };
    const url = new URL(`https://api.giphy.com/v1/gifs/search`)
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    const resp = await fetch(url)
    const json = await resp.json()
    const result = json.data.length > 0 ? json.data[Math.floor(Math.random() * json.data.length)].images.downsized.url : 'https://media.giphy.com/media/3zhxq2ttgN6rEw8SDx/giphy.gif';
    return result
  }

  setImg = async () => {
    const img = await this.fetchImg()
    this.elem.src = img
    this.elem.style.maxWidth = "100vw"
    this.shadow.appendChild(this.elem)
    setTimeout(() => this.sendError(), 2000)
  }

  sendError = () => {
    nr.noticeError(new Error(`${this.name} called noticeError()`))
  }
}
customElements.define('puppy-component', PuppyComponent)

export function mount(){
  const root = document.body
  const webComponent = document.createElement('puppy-component')
  
  root.appendChild(webComponent)
}