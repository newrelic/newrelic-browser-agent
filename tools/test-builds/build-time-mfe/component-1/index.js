import {BrowserAgent} from '@newrelic/browser-agent'
// 

const nrConfig = {
  ...NREUM.init,
   ...NREUM.info, 
   ...NREUM.loader_config, 
  // licenseKey: 'asdf',
  applicationID: 1
}


const nr = new BrowserAgent() // Create a new instance of the Browser Agent
nr.features.errors.auto = false // Only capture errors through noticeError()

nr.start(nrConfig).then(() => {
  console.debug("agent initialized! -- Puppies Component", nrConfig)
})


class PuppyComponent extends HTMLElement {
  static name = "puppy-component"
  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.elem = document.createElement('img')
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
    this.elem.style.maxHeight = '250px'
    this.shadow.appendChild(this.elem)
    this.sendError()
  }

  sendError = () => {
    console.debug(`NOTICING (nr.noticeError()) an error in ${this.name}`)
    const err = new Error(`nr.noticeError() called in ${this.name} (Component-1)!`)
    nr.noticeError(err, {customAttr: 'hi'})
    throw new Error(`component-1 threw global error`)
  }
}
customElements.define(PuppyComponent.name, PuppyComponent)

export function mount(elem){
  const webComponent = document.createElement(PuppyComponent.name)
  
  elem.appendChild(webComponent)
}

export function unmount() {
  document.querySelectorAll(PuppyComponent.name).forEach(component => component.remove())
}