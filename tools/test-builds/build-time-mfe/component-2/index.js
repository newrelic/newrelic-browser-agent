import BrowserAgent from "@newrelic/browser-agent";

const info = {
  ...NREUM.info,
  applicationID: 2,
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

// nr.features.errors.auto = false // Disable auto instrumentation (full page)

nr.start({ info, init, loader_config, exposed: false });

console.log("component 2, nr", nr);

class KittenComponent extends HTMLElement {
  static name = "kitten-component";
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.elem = document.createElement("img");
    this.name = "Kitten Component";
    this.setImg();
  }

  fetchImg = async () => {
    const params = {
      api_key: "TMWFkdtKTv6To8CjL9OqC2KBNQTM8D3N",
      q: "kitten",
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
    const err = new Error(`nr.noticeError() called in ${this.name} (Component-2)!`);
    nr.noticeError(err);
    // throw new Error(`${this.name} called nr.noticeError() then intentionally threw this GLOBAL error!`)
  };
}
customElements.define(KittenComponent.name, KittenComponent);

export function mount(elem) {
  const webComponent = document.createElement(KittenComponent.name);

  elem.appendChild(webComponent);
}

export function unmount() {
  document.querySelectorAll(KittenComponent.name).forEach((component) => component.remove());
}
