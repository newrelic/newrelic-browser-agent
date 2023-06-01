import browsersSelenium from '../../browsers-lists/browsers-selenium.json' assert { type: 'json' }
import browsersList from '../../browsers-lists/browsers-list.mjs'
import args from '../args.mjs'

export default function config () {
  if (!args.selenium) {
    return {}
  } else {
    return {
      hostname: args.seleniumHost,
      port: args.seleniumPort,
      capabilities: browsersList(browsersSelenium, args.browsers)
    }
  }
}
