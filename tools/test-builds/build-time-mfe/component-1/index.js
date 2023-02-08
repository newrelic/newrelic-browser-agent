import BrowserAgent from "@newrelic/browser-agent";

const info = {
  ...NREUM.info,
  applicationID: 1,
};
const init = {
  ...NREUM.init,
  page_view_event: { enabled: false },
  ajax: { enabled: false },
  page_view_timing: { enabled: false },
  session_trace: { enabled: false },
  spa: { enabled: false },
  jserrors: { auto: false },
};
const loader_config = {
  ...NREUM.loader_config,
};

// this should notice global errors
const nr = new BrowserAgent();
// nr.features.errors.auto = false // Only capture errors through noticeError()

nr.start({ info, init, loader_config, exposed: false });

console.log("component 1 ", nr);

class PuppyComponent extends HTMLElement {
  static name = "puppy-component";
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.elem = document.createElement("img");
    this.name = "Puppy Component";
    this.setImg();
  }

  fetchImg = async () => {
    const params = {
      api_key: "TMWFkdtKTv6To8CjL9OqC2KBNQTM8D3N",
      q: "puppy",
      limit: 100,
    };
    const url = new URL(`https://api.giphy.com/v1/gifs/search`);
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));
    const resp = await fetch(url);
    const json = await resp.json();
    const result =
      json.data.length > 0
        ? json.data[Math.floor(Math.random() * json.data.length)].images.downsized.url
        : "https://media.giphy.com/media/3zhxq2ttgN6rEw8SDx/giphy.gif";
    return result;
  };

  setImg = async () => {
    const img = await this.fetchImg();
    this.elem.src = img;
    this.elem.style.maxWidth = "100vw";
    this.elem.style.maxHeight = "250px";
    this.shadow.appendChild(this.elem);
    this.sendError();
  };

  sendError = () => {
    console.debug(`NOTICING (nr.noticeError()) an error in ${this.name}`);
    const err = new Error(`nr.noticeError() called in ${this.name} (Component-1)!`);
    nr.noticeError(err, { customAttr: "hi" });
    throw new Error(`component-1 threw global error`);
  };
}
customElements.define(PuppyComponent.name, PuppyComponent);

export function mount(elem) {
  const webComponent = document.createElement(PuppyComponent.name);

  elem.appendChild(webComponent);
}

export function unmount() {
  document.querySelectorAll(PuppyComponent.name).forEach((component) => component.remove());
}
