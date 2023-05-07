import browsersSelenium from '../../browsers-lists/browsers-selenium.json' assert { type: "json" }
import browsersList from '../../browsers-lists/browsers-list.mjs'
import jilArgs from '../args.mjs'

export default function config () {
  if (!jilArgs.selenium) {
    return {}
  } else {
    return {
      hostname: jilArgs.seleniumHost,
      port: jilArgs.seleniumPort,
      capabilities: browsersList(browsersSelenium, jilArgs.browsers)
    }
  }
}
